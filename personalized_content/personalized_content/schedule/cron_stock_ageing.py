import frappe
from frappe.desk.query_report import run
import requests
from frappe.utils import today, now_datetime
import json
import logging

# Cấu hình logging để ghi lại thông tin và lỗi
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
URL = "http://localhost:8080/webhook/erpnext"  # Thay đổi URL nếu cần

def push_stock_ageing_to_localhost():
    try:
        # Gọi báo cáo Stock Ageing từ ERPNext
        logger.info("Starting to fetch Stock Ageing Report...")
        report = run(
            report_name="Stock Ageing",
            filters={
                "company": "tada",
                "to_date": today(),  # Sử dụng ngày hiện tại
                "range": "30, 60, 90"
            },
            ignore_prepared_report=False
        )
        
        # Kiểm tra dữ liệu báo cáo
        if not report or not report.get("result"):
            logger.error("No data found in Stock Ageing report")
            return
        
        logger.info(f"Fetched {len(report.get('result', []))} records from Stock Ageing Report")

        # Tạo mapping từ fieldname sang label từ columns
        columns = report.get("columns", [])
        fieldname_to_label = {col["fieldname"]: col["label"] for col in columns}

        # Biến đổi result để sử dụng label làm key thay vì fieldname
        transformed_result = []
        for item in report.get("result", []):
            transformed_item = {}
            for fieldname, value in item.items():
                # Sử dụng label từ mapping, nếu không có thì giữ nguyên fieldname
                label = fieldname_to_label.get(fieldname, fieldname)
                transformed_item[label] = value
            transformed_result.append(transformed_item)

        # Định dạng payload theo cấu trúc yêu cầu, loại bỏ columns
        payload = {
            "doctype": "Stock Ageing Report",
            "event": "scheduled_job",
            "message": "Stock Ageing Report generated",
            "data": {
                "result": transformed_result,
                "chart": report.get("chart", {}),
                "report_summary": report.get("report_summary", None),
                "skip_total_row": report.get("skip_total_row", 0),
                "status": report.get("status", None),
                "execution_time": report.get("execution_time", 0),
                "add_total_row": report.get("add_total_row", 0),
                "metadata": {
                    "creation": now_datetime().strftime("%Y-%m-%d %H:%M:%S"),
                    "modified": now_datetime().strftime("%Y-%m-%d %H:%M:%S"),
                    "modified_by": "admin@tada.com",
                    "owner": "admin@tada.com"
                }
            }
        }
        
        # Cấu hình endpoint localhost
        external_system_url = URL
        headers = {
            "Content-Type": "application/json"
        }
        
        # Gửi dữ liệu qua HTTP POST
        logger.info(f"Sending data to {external_system_url}...")
        response = requests.post(
            external_system_url,
            data=json.dumps(payload),
            headers=headers,
            timeout=30
        )
        
        # Kiểm tra phản hồi
        if response.status_code == 200:
            logger.info("Stock Ageing data pushed successfully to localhost:8080")
        else:
            logger.error(f"Failed to push data. Status code: {response.status_code}, Response: {response.text}")
        
    except requests.exceptions.RequestException as e:
        logger.error(f"Network error while pushing data: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error occurred: {str(e)}")

# Hàm chính để chạy (dùng cho Cron Job hoặc Scheduler)
if __name__ == "__main__":
    push_stock_ageing_to_localhost()