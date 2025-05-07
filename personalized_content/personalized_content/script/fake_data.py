import frappe
from frappe.utils import now
from faker import Faker
import random
from tqdm import tqdm
from unidecode import unidecode  # Thêm unidecode để chuẩn hóa ký tự tiếng Việt

# Khởi tạo Faker với ngôn ngữ tiếng Việt
fake = Faker('vi_VN')

# Danh sách tên Customer Group
customer_group_names = [
    "Khách Hàng Tiềm Năng",
    "Khách Hàng Thân Thiết",
    "Khách Hàng VIP",
    "Khách Hàng Mới",
    "Khách Hàng Cao Cấp",
    "Khách Hàng Trung Thành",
    "Khách Hàng Doanh Nghiệp",
    "Khách Hàng Cá Nhân",
    "Khách Hàng Đặc Biệt",
    "Khách Hàng Ưu Tiên"
]

def create_demo_data(num_customers=100, num_personalized_contents=200):
    # Xóa dữ liệu cũ
    frappe.db.truncate("Customer Group")
    frappe.db.truncate("Customer")
    frappe.db.truncate("Personalized Content")
    frappe.db.truncate("Contact")
    frappe.db.truncate("Address")

    # Tạo Territory
    territories = ["Vietnam", "Hà Nội", "TP Hồ Chí Minh", "Đà Nẵng"]
    for territory in territories:
        if not frappe.db.exists("Territory", territory):
            frappe.get_doc({
                "doctype": "Territory",
                "territory_name": territory,
                "is_group": 0,
                "parent_territory": "All Territories"
            }).insert(ignore_permissions=True)

    # Tạo Price List
    price_lists = ["Standard Selling"]
    for price_list in price_lists:
        if not frappe.db.exists("Price List", price_list):
            frappe.get_doc({
                "doctype": "Price List",
                "price_list_name": price_list,
                "currency": "VND",
                "enabled": 1
            }).insert(ignore_permissions=True)

    # 1. Tạo Customer Group
    customer_groups = []
    for group_name in tqdm(customer_group_names, desc="Tạo Customer Groups"):
        group = frappe.get_doc({
            "doctype": "Customer Group",
            "customer_group_name": group_name,
            "is_group": 0,
            "custom_customer_group_summary": fake.text(max_nb_chars=100),
        })
        group.insert(ignore_permissions=True)
        customer_groups.append(group)

    # 2. Tạo Customer
    customers = []
    salutations = ["Mr", "Ms", "Mrs"]
    genders = ["Male", "Female"]
    used_names = set()  # Lưu trữ tên đã dùng
    used_emails = set()  # Lưu trữ email đã dùng

    for i in tqdm(range(num_customers), desc="Tạo Customers"):
        # Tạo tên khách hàng
        base_name = fake.name()
        customer_name = base_name
        counter = 1
        while customer_name in used_names:
            customer_name = f"{base_name} {counter}"  # Thêm số thứ tự nếu trùng
            counter += 1
        used_names.add(customer_name)

        # Tạo email dựa trên tên, chuẩn hóa ký tự tiếng Việt
        email_base = unidecode(customer_name).replace(" ", "_").lower()
        email_id = f"{email_base}@example.com"
        email_counter = 1
        while email_id in used_emails:
            email_id = f"{email_base}_{email_counter}@example.com"
            email_counter += 1
        used_emails.add(email_id)

        customer = frappe.get_doc({
            "doctype": "Customer",
            "salutation": random.choice(salutations),
            "customer_name": customer_name,
            "customer_type": "Individual",
            "customer_group": random.choice(customer_groups).name,
            "territory": random.choice(territories),
            "gender": random.choice(genders),
            "lead_name": "",
            "opportunity_name": "",
            "account_manager": "Administrator",
            "default_price_list": "Standard Selling",
            "language": "vi",
            "custom_customer_summary": fake.text(max_nb_chars=100),
            "mobile_no": fake.phone_number(),
            "email_id": email_id,
        })
        try:
            customer.insert(ignore_permissions=True)
            customers.append(customer)
        except frappe.DuplicateEntryError as e:
            print(f"Lỗi trùng lặp khi tạo khách hàng: {customer_name} - {str(e)}")
            continue
        except frappe.exceptions.InvalidEmailAddressError as e:
            print(f"Lỗi email không hợp lệ: {email_id} - {str(e)}")
            continue

    # 3. Tạo Personalized Content
    statuses = ["Draft", "Submitted", "Approved"]
    for i in tqdm(range(num_personalized_contents), desc="Tạo Personalized Contents"):
        has_customer = random.choice([True, False])
        customer = random.choice(customers) if has_customer else None
        customer_group = random.choice(customer_groups)

        # Tạo nội dung tự nhiên
        content = f"<p>{fake.text(max_nb_chars=200)}</p>"

        personalized_content = frappe.get_doc({
            "doctype": "Personalized Content",
            "customer_type": "Customer",
            "customer": customer.name if customer else None,
            "customer_group": customer_group.name,
            "content": content,
            "status": random.choice(statuses),
            "amount": random.randint(100000, 10000000),
            "date_time": now(),
            "explaination": fake.text(max_nb_chars=50),
        })
        try:
            personalized_content.insert(ignore_permissions=True)
        except frappe.DuplicateEntryError as e:
            print(f"Lỗi trùng lặp khi tạo Personalized Content: {i} - {str(e)}")
            continue

    # Commit dữ liệu
    frappe.db.commit()
    print(f"Đã tạo {len(customer_groups)} Customer Groups, {len(customers)} Customers, và {num_personalized_contents} Personalized Contents!")

# Chạy hàm
create_demo_data(num_customers=200, num_personalized_contents=1000)