import sqlite3
import json
from datetime import datetime
from pathlib import Path
import hashlib


def _hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()

class LesionDatabase:
    def __init__(self, db_path: str = "data/lesion_history.db"):
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def _init_db(self):
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            # Create table for lesion records
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS lesion_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    lesion_id TEXT NOT NULL,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    prediction TEXT NOT NULL,  -- JSON string of predictions
                    image_path TEXT,
                    metadata TEXT              -- JSON string of patient metadata
                )
            """)

            cursor.execute("""
                CREATE TABLE IF NOT EXISTS patient_users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    phone TEXT NOT NULL UNIQUE,
                    password_hash TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)

            cursor.execute("""
                CREATE TABLE IF NOT EXISTS patient_cases (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    phone TEXT NOT NULL,
                    lesion_id TEXT NOT NULL,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    full_name TEXT,
                    father_name TEXT,
                    age INTEGER,
                    sex TEXT,
                    body_part TEXT,
                    model_variant TEXT,
                    prediction TEXT NOT NULL,
                    recommendation TEXT,
                    comparison TEXT,
                    image_path TEXT
                )
            """)
            conn.commit()

    def add_record(self, lesion_id: str, prediction: dict, image_path: str = None, metadata: dict = None):
        """Adds a new prediction record for a specific lesion."""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO lesion_history (lesion_id, prediction, image_path, metadata) VALUES (?, ?, ?, ?)",
                (lesion_id, json.dumps(prediction), image_path, json.dumps(metadata) if metadata else None)
            )
            conn.commit()

    def get_history(self, lesion_id: str):
        """Retrieves all records for a specific lesion, ordered by time."""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT timestamp, prediction, image_path, metadata FROM lesion_history WHERE lesion_id = ? ORDER BY timestamp ASC",
                (lesion_id,)
            )
            rows = cursor.fetchall()
            
            history = []
            for row in rows:
                history.append({
                    "timestamp": row[0],
                    "prediction": json.loads(row[1]),
                    "image_path": row[2],
                    "metadata": json.loads(row[3]) if row[3] else None
                })
            return history

    def register_patient(self, phone: str, password: str):
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id FROM patient_users WHERE phone = ?", (phone,))
            if cursor.fetchone() is not None:
                return False, "Bu telefon raqam allaqachon ro'yxatdan o'tgan."

            cursor.execute(
                "INSERT INTO patient_users (phone, password_hash) VALUES (?, ?)",
                (phone, _hash_password(password)),
            )
            conn.commit()
        return True, "Muvaffaqiyatli ro'yxatdan o'tdingiz."

    def verify_patient(self, phone: str, password: str):
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT password_hash FROM patient_users WHERE phone = ?", (phone,))
            row = cursor.fetchone()
            if row is None:
                return False
            return row[0] == _hash_password(password)

    def patient_exists(self, phone: str):
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT 1 FROM patient_users WHERE phone = ?", (phone,))
            return cursor.fetchone() is not None

    def change_patient_password(self, phone: str, old_password: str, new_password: str):
        if not self.verify_patient(phone, old_password):
            return False, "Eski parol noto'g'ri."

        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE patient_users SET password_hash = ? WHERE phone = ?",
                (_hash_password(new_password), phone),
            )
            conn.commit()
        return True, "Parol yangilandi."

    def add_patient_case(
        self,
        phone: str,
        lesion_id: str,
        full_name: str,
        father_name: str,
        age: int,
        sex: str,
        body_part: str,
        model_variant: str,
        prediction: dict,
        recommendation: dict | None,
        comparison: str | None,
        image_path: str | None = None,
    ):
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO patient_cases (
                    phone, lesion_id, full_name, father_name, age, sex, body_part,
                    model_variant, prediction, recommendation, comparison, image_path
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    phone,
                    lesion_id,
                    full_name,
                    father_name,
                    age,
                    sex,
                    body_part,
                    model_variant,
                    json.dumps(prediction),
                    json.dumps(recommendation) if recommendation else None,
                    comparison,
                    image_path,
                ),
            )
            conn.commit()

    def get_patient_cases(self, phone: str):
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT timestamp, full_name, father_name, age, sex, body_part,
                       model_variant, prediction, recommendation, comparison
                FROM patient_cases
                WHERE phone = ?
                ORDER BY timestamp DESC
                """,
                (phone,),
            )
            rows = cursor.fetchall()

            items = []
            for row in rows:
                items.append(
                    {
                        "timestamp": row[0],
                        "full_name": row[1],
                        "father_name": row[2],
                        "age": row[3],
                        "sex": row[4],
                        "body_part": row[5],
                        "model_variant": row[6],
                        "prediction": json.loads(row[7]),
                        "recommendation": json.loads(row[8]) if row[8] else None,
                        "comparison": row[9],
                    }
                )
            return items

    def get_doctor_patients(self, limit: int = 20):
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT p1.phone, p1.full_name, p1.age, p1.sex, p1.body_part,
                       p1.timestamp, p1.model_variant, p1.prediction,
                       (SELECT COUNT(*) FROM patient_cases p2 WHERE p2.phone = p1.phone) AS total_cases
                FROM patient_cases p1
                JOIN (
                    SELECT phone, MAX(timestamp) AS last_ts
                    FROM patient_cases
                    GROUP BY phone
                ) latest
                ON latest.phone = p1.phone AND latest.last_ts = p1.timestamp
                ORDER BY p1.timestamp DESC
                LIMIT ?
                """,
                (int(limit),),
            )
            rows = cursor.fetchall()

            items = []
            for row in rows:
                prediction = json.loads(row[7]) if row[7] else {}
                top_label = "Noma'lum"
                top_prob = 0.0
                if prediction:
                    top_label = max(prediction, key=prediction.get)
                    top_prob = float(prediction[top_label])

                items.append(
                    {
                        "phone": row[0],
                        "full_name": row[1],
                        "age": row[2],
                        "sex": row[3],
                        "body_part": row[4],
                        "last_timestamp": row[5],
                        "model_variant": row[6],
                        "top_label": top_label,
                        "top_confidence": top_prob,
                        "total_cases": row[8],
                    }
                )
            return items

    def get_doctor_recent_cases(self, limit: int = 30):
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT phone, full_name, body_part, timestamp, model_variant, prediction, comparison
                FROM patient_cases
                ORDER BY timestamp DESC
                LIMIT ?
                """,
                (int(limit),),
            )
            rows = cursor.fetchall()

            items = []
            for row in rows:
                prediction = json.loads(row[5]) if row[5] else {}
                top_label = "Noma'lum"
                top_prob = 0.0
                if prediction:
                    top_label = max(prediction, key=prediction.get)
                    top_prob = float(prediction[top_label])

                items.append(
                    {
                        "phone": row[0],
                        "full_name": row[1],
                        "body_part": row[2],
                        "timestamp": row[3],
                        "model_variant": row[4],
                        "top_label": top_label,
                        "top_confidence": top_prob,
                        "comparison": row[6],
                    }
                )
            return items

    def get_doctor_stats(self):
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM patient_users")
            users_count = cursor.fetchone()[0]
            cursor.execute("SELECT COUNT(*) FROM patient_cases")
            cases_count = cursor.fetchone()[0]
            return {
                "registered_patients": int(users_count),
                "total_cases": int(cases_count),
            }

# Global instance
db = LesionDatabase()
