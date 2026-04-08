from __future__ import annotations
import requests
import threading
import time
import datetime
import traceback
import os
from pathlib import Path
import matplotlib.pyplot as plt
import torch
import io
import signal
import sys
from PIL import Image

try:
    import pynvml
    NVML_AVAILABLE = True
except ImportError:
    NVML_AVAILABLE = False

from core.config import settings


class TelegramNotifier:
    """
    Professional Telegram Monitoring Module for PyTorch Training.
    Supports periodic reports, graphs, GPU monitoring, and error reporting.
    """

    def __init__(self):
        self.token = settings.TELEGRAM_BOT_TOKEN
        self.chat_id = settings.TELEGRAM_CHAT_ID
        self.enabled = settings.TELEGRAM_ENABLED
        self.interval = settings.TELEGRAM_REPORT_INTERVAL_MINUTES * 60
        
        self.start_time = None
        self.is_training_active = False
        self.run_callback = None
        self.on_stop_callback = None
        self._timer_thread = None
        self._command_thread = None
        
        # Metrics storage
        self.metrics = {
            "epoch": 0,
            "total_epochs": 0,
            "train_loss": 0.0,
            "val_loss": 0.0,
            "val_acc": 0.0,
            "best_acc": 0.0,
            "lr": 0.0,
            "history": {"train_loss": [], "val_acc": []}
        }
        
        if NVML_AVAILABLE and settings.ENABLE_GPU_MONITORING:
            try:
                pynvml.nvmlInit()
            except:
                pass
        
        self._register_signals()

    def _register_signals(self):
        """Registers handlers for script termination."""
        for sig in (signal.SIGINT, signal.SIGTERM):
            try:
                signal.signal(sig, self._signal_handler)
            except:
                pass

    def _signal_handler(self, sig, frame):
        """Notifies user and exits safely when the script is closed."""
        msg = "⚠️ *Dastur kutilmaganda to'xtatildi (yoki yopildi).* \nTrening holati oxirgi nuqtada saqlab qolindi."
        self.send_message(msg)
        # Cleanup and exit
        if self.is_training_active:
            self.stop(success=False)
        sys.exit(0)

    def _get_keyboard(self, custom_layout: list = None):
        """Returns the JSON for the Telegram Reply Keyboard."""
        if custom_layout:
            layout = custom_layout
        else:
            layout = [
                [{"text": "🚀 Start Phase 2"}, {"text": "ℹ️ Status"}],
                [{"text": "📉 Graph"}, {"text": "🛑 Stop"}]
            ]
        
        return {
            "keyboard": layout,
            "resize_keyboard": True,
            "one_time_keyboard": False
        }

    def _send_request(self, method: str, data: dict = None, files: dict = None, custom_kb: list = None, timeout: int = 15):
        if not self.enabled:
            return
        url = f"https://api.telegram.org/bot{self.token}/{method}"
        
        # Add keyboard to messsages by default
        if method == "sendMessage" and data and "reply_markup" not in data:
            import json
            data["reply_markup"] = json.dumps(self._get_keyboard(custom_kb))
            
        try:
            res = requests.post(url, data=data, files=files, timeout=timeout)
            return res.json()
        except Exception as e:
            # We don't print timeout errors to keep terminal clean
            if "timeout" not in str(e).lower():
                print(f"⚠️ Telegram Error: {e}")
            return None

    def send_message(self, text: str, parse_mode: str = "Markdown"):
        return self._send_request("sendMessage", {"chat_id": self.chat_id, "text": text, "parse_mode": parse_mode})

    def send_photo(self, photo_bytes: bytes, caption: str = ""):
        files = {"photo": ("graph.png", photo_bytes, "image/png")}
        return self._send_request("sendPhoto", {"chat_id": self.chat_id, "caption": caption, "parse_mode": "Markdown"}, files=files)

    def _get_gpu_stats(self):
        if not NVML_AVAILABLE or not settings.ENABLE_GPU_MONITORING:
            return "N/A"
        try:
            handle = pynvml.nvmlDeviceGetHandleByIndex(0)
            name = pynvml.nvmlDeviceGetName(handle)
            mem = pynvml.nvmlDeviceGetMemoryInfo(handle)
            temp = pynvml.nvmlDeviceGetTemperature(handle, pynvml.NVML_TEMPERATURE_GPU)
            return (f"🖥 *GPU:* {name}\n"
                    f"🌡 *Temp:* {temp}°C\n"
                    f"📊 *Memory:* {mem.used // 1024**2} / {mem.total // 1024**2} MB")
        except:
            return "Error reading GPU"

    def _generate_report(self, title: str = "📊 Training Progress Report"):
        # If we are not active, check if it's completely off or just starting
        if not self.is_training_active:
            return f"{title}\n\nℹ️ *Trening to'xtatilgan yoki kutish rejimida.*"
            
        if self.start_time is None:
            return f"{title}\n\n🔄 *Tayyorgarlik ko'rilmoqda...* \n(Ma'lumotlar yuklanmoqda, kuting...)"
            
        elapsed = datetime.datetime.now() - self.start_time
        elapsed_str = str(elapsed).split(".")[0]
        
        # ETA calculation
        idx = self.metrics["epoch"]
        total = self.metrics["total_epochs"]
        if idx > 0:
            eta_seconds = (elapsed.total_seconds() / idx) * (total - idx)
            eta = str(datetime.timedelta(seconds=int(eta_seconds)))
        else:
            eta = "Calculating..."

        msg = (
            f"{title}\n\n"
            f"📅 *Epoch:* {idx} / {total}\n"
            f"⏱ *Elapsed:* {elapsed_str}\n"
            f"⏳ *ETA:* {eta}\n\n"
            f"📉 *Train Loss:* {self.metrics['train_loss']:.4f}\n"
            f"📈 *Val Acc:* {self.metrics['val_acc']:.2%}\n"
            f"🏆 *Best Acc:* {self.metrics['best_acc']:.2%}\n"
            f"🔗 *LR:* {self.metrics['lr']:.2e}\n\n"
            f"{self._get_gpu_stats()}"
        )
        return msg

    def _create_loss_graph(self):
        if not self.metrics["history"]["train_loss"]:
            return None
        plt.figure(figsize=(10, 5))
        plt.plot(self.metrics["history"]["train_loss"], label="Train Loss")
        plt.title("Training Loss History")
        plt.xlabel("Epoch")
        plt.ylabel("Loss")
        plt.legend()
        plt.grid(True)
        
        buf = io.BytesIO()
        plt.savefig(buf, format="png")
        plt.close()
        return buf.getvalue()

    def _timer_loop(self):
        while True: # Keep thread alive, check status inside
            if self.is_training_active:
                msg = self._generate_report("⏰ *45 minutlik hisobot*")
                photo = self._create_loss_graph()
                if photo:
                    self.send_photo(photo, caption=msg)
                else:
                    self.send_message(msg)
            time.sleep(self.interval)

    def _safe_run_callback(self):
        """Standard wrapper to run the training callback and catch crashes."""
        try:
            if self.run_callback:
                print(f"🛠 Executing run_callback: {self.run_callback.__name__ if hasattr(self.run_callback, '__name__') else 'lambda'}")
                self.run_callback()
            else:
                print("⚠️ No run_callback defined.")
        except Exception as e:
            msg = f"❌ *Callback Crash:* {str(e)}"
            print(msg)
            import traceback
            traceback.print_exc()
            self.send_message(msg)

    def _command_loop(self):
        last_update_id = 0
        print("🤖 Telegram Command Polling Started (Always ON)...")
        while True:  # Persistent loop
            try:
                updates = self._send_request("getUpdates", {"offset": last_update_id + 1, "timeout": 20}, timeout=25)
                if updates and updates.get("ok"):
                    for update in updates.get("result", []):
                        last_update_id = update["update_id"]
                        msg = update.get("message")
                        if not msg: continue
                        
                        text = msg.get("text", "").lower()
                        caption = msg.get("caption", "").lower() if msg.get("caption") else ""
                        photo = msg.get("photo")
                        from_id = str(msg.get("chat", {}).get("id"))
                        
                        if from_id != self.chat_id:
                            continue

                        # Handle Photos (Diagnosis)
                        if photo:
                            self.send_message("🔍 *Rasm qabul qilindi. AI tahlil qilmoqda...*")
                            # Get the largest photo
                            file_id = photo[-1]["file_id"]
                            file_info = self._send_request("getFile", {"file_id": file_id})
                            
                            if file_info and file_info.get("ok"):
                                file_path = file_info["result"]["file_path"]
                                download_url = f"https://api.telegram.org/file/bot{self.token}/{file_path}"
                                response = requests.get(download_url)
                                
                                if response.status_code == 200:
                                    img = Image.open(io.BytesIO(response.content))
                                    
                                    # Look for #ID in caption
                                    import re
                                    lesion_id = "default"
                                    match = re.search(r"#(\w+)", caption)
                                    if match:
                                        lesion_id = match.group(1)
                                        self.send_message(f"🆔 *Lesion ID aniqlandi:* `{lesion_id}`")

                                    # Perform Prediction
                                    from core.predict import predict_with_history
                                    from core.model import load_model
                                    from core.config import settings
                                    
                                    # Load model if not already (Cache it on the instance)
                                    if not hasattr(self, "_model_bundle") or self._model_bundle is None:
                                        # Try to load best multimodal first
                                        m_path = Path("weights/best_7class_multimodal.pt")
                                        if not m_path.exists(): m_path = Path("weights/best_7class.pt")
                                        self._model_bundle = load_model(m_path, settings.device)

                                    result, comp_report = predict_with_history(self._model_bundle, img, lesion_id)
                                    
                                    # Format response
                                    top_results = "\n".join([f"🔹 *{n}:* {p:.1%}" for n, p in result.top_3])
                                    diag_msg = (
                                        f"🩺 *AI Tashhisi:* \n\n"
                                        f"🏆 *Asosiy:* `{result.label}` ({result.confidence:.1%})\n\n"
                                        f"📊 *Ehtimolliklar:* \n{top_results}\n"
                                    )
                                    
                                    if result.warning:
                                        diag_msg += f"\n⚠️ *OGOHLANTIRISH:* \n_{result.warning}_\n"
                                        
                                    self.send_message(diag_msg)
                                    
                                    if comp_report:
                                        self.send_message(comp_report)
                                else:
                                    self.send_message("❌ Rasmni yuklab olishda xatolik yuz berdi.")
                            continue
                        
                        # Handle both slash commands and button text
                        if text in ["/start", "/resume", "🚀 start / resume", "🚀 start phase 2", "🚀 start phase 3", "🔍 phase 2 evaluation"]:
                            if self.is_training_active:
                                self.send_message("⚠️ *Trening allaqachon ishlamoqda.*")
                            else:
                                # Look up the specific callback for this button if available
                                cb = getattr(self, "phase_callbacks", {}).get(text, self.run_callback)
                                if cb:
                                    self.run_callback = cb
                                    self.send_message("🔄 *Treningni boshlayman (davom ettiraman)...* \n(Tayyorgarlik ko'rilmoqda, kuting...)")
                                    threading.Thread(target=self._safe_run_callback, daemon=True).start()
                                else:
                                    self.send_message("❌ *Xatolik:* Ushbu bosqich uchun funksiya topilmadi.")
                        
                        elif text in ["/status", "ℹ️ status"]:
                            self.send_message(self._generate_report("ℹ️ *Hozirgi holat:*"))
                        
                        elif text in ["/graph", "📉 graph"]:
                            photo = self._create_loss_graph()
                            if photo:
                                self.send_photo(photo, caption="📉 *Loss grafigi*")
                            else:
                                self.send_message("❌ Grafik hali shakllanmagan.")
                        
                        elif text in ["/stop", "🛑 stop"]:
                            if self.is_training_active:
                                self.send_message("⛔️ *To'xtatish buyrug'i qabul qilindi.*")
                                self.is_training_active = False
                            else:
                                self.send_message("ℹ️ *Trening hozir o'zi ishlamayapti.*")
                time.sleep(1)
            except Exception as e:
                print(f"⚠️ Command Loop Error: {e}")
                time.sleep(5)

    def start_monitoring(self, run_callback=None):
        """
        Starts the always-on command listener.
        """
        self.run_callback = run_callback
        self.is_training_active = False
        self._command_loop()

    def training_started(self, total_epochs: int):
        self.start_time = datetime.datetime.now()
        self.metrics["total_epochs"] = total_epochs
        self.is_training_active = True
        
        start_msg = (
            "🚀 *Training (Re)Started!*\n\n"
            f"🕒 *Vaqt:* {self.start_time.strftime('%H:%M:%S')}\n"
            f"📦 *Jami epochs:* {total_epochs}\n"
            "🎮 *Buyruqlar:* /status, /graph, /stop"
        )
        self.send_message(start_msg)
        
        # Periodic report thread (only if not already running)
        if self._timer_thread is None or not self._timer_thread.is_alive():
            self._timer_thread = threading.Thread(target=self._timer_loop, daemon=True)
            self._timer_thread.start()

    def update_metrics(self, epoch: int, train_loss: float, val_acc: float, best_acc: float, lr: float):
        self.metrics["epoch"] = epoch
        self.metrics["train_loss"] = train_loss
        self.metrics["val_acc"] = val_acc
        self.metrics["best_acc"] = best_acc
        self.metrics["lr"] = lr
        self.metrics["history"]["train_loss"].append(train_loss)
        self.metrics["history"]["val_acc"].append(val_acc)

    def checkpoint_saved(self, path: Path):
        size_mb = os.path.getsize(path) / (1024 * 1024)
        msg = f"💾 *Checkpoint Saved!*\n📍 `{path.name}`\n⚖️ *Size:* {size_mb:.2f} MB"
        self.send_message(msg)

    def stop(self, success: bool = True):
        self.is_training_active = False
        status = "✅ *Trening yakunlandi!*" if success else "🛑 *To'xtatildi.*"
        msg = self._generate_report(status)
        photo = self._create_loss_graph()
        if photo:
            self.send_photo(photo, caption=msg)
        else:
            self.send_message(msg)
        
        # Trigger next phase logic if registered
        if self.on_stop_callback:
            threading.Thread(target=self.on_stop_callback, daemon=True).start()
        
        if NVML_AVAILABLE:
            try:
                pynvml.nvmlShutdown()
            except:
                pass

    def crash(self, error: Exception):
        err_msg = (
            "🆘 *TRAINING CRASHED!*\n\n"
            f"❌ *Error:* `{str(error)}`\n\n"
            f"📜 *Traceback:*\n```{traceback.format_exc()[-1000:]}```"
        )
        self.send_message(err_msg)
        self.stop(success=False)


# Global instance
notifier = TelegramNotifier()
