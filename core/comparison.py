from datetime import datetime

class LesionComparator:
    @staticmethod
    def compare_records(old_record: dict, new_record: dict):
        """
        Compares two records and returns a summary of changes.
        Records are expected to be from LesionDatabase.get_history()
        """
        old_pred = old_record["prediction"]
        new_pred = new_record["prediction"]
        
        # Get the primary diagnosis (highest probability) for both
        old_top = max(old_pred, key=old_pred.get)
        new_top = max(new_pred, key=new_pred.get)
        
        prob_diff = new_pred.get(new_top, 0) - old_pred.get(new_top, 0)
        
        # Calculate time difference
        fmt = "%Y-%m-%d %H:%M:%S"
        t1 = datetime.strptime(old_record["timestamp"], fmt)
        t2 = datetime.strptime(new_record["timestamp"], fmt)
        days_diff = (t2 - t1).days
        
        comparison = {
            "days_elapsed": days_diff,
            "old_diagnosis": old_top,
            "new_diagnosis": new_top,
            "old_probability": old_pred.get(old_top, 0),
            "new_probability": new_pred.get(new_top, 0),
            "change_in_primary": prob_diff,
            "status": "stable" if abs(prob_diff) < 0.05 else ("improving" if prob_diff < 0 else "worsening")
        }
        
        return comparison

    @staticmethod
    def generate_report(comparison: dict):
        """Generates a human-readable Uzbek report from a comparison dictionary."""
        days = comparison["days_elapsed"]
        old_p = comparison["old_probability"] * 100
        new_p = comparison["new_probability"] * 100
        diff = comparison["change_in_primary"] * 100
        
        status_map = {
            "stable": "🟡 Barqaror (O'zgarishsiz)",
            "improving": "🟢 Yaxshilanish (Ehtimollik kamaydi)",
            "worsening": "🔴 Diqqat! Salbiy o'zgarish (Ehtimollik oshdi)"
        }
        
        report = (
            f"📊 *Dinamik Kuzatuv Hisoboti* ({days} kun oralig'ida)\n\n"
            f"🕒 *Vaqt oralig'i:* {days} kun\n"
            f"🏷 *Avvalgi tashxis:* {comparison['old_diagnosis']} ({old_p:.1f}%)\n"
            f"🏷 *Hozirgi tashxis:* {comparison['new_diagnosis']} ({new_p:.1f}%)\n\n"
            f"📈 *O'zgarish:* {diff:+.1f}%\n"
            f"📝 *Holat:* {status_map[comparison['status']]}\n"
        )
        return report

# Global instance
comparator = LesionComparator()
