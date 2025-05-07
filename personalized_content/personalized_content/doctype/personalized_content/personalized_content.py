# Copyright (c) 2025, Nam and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document

class PersonalizedContent(Document):
    # begin: auto-generated types
    # This code is auto-generated. Do not modify anything in this block.

    from typing import TYPE_CHECKING

    if TYPE_CHECKING:
        from erpnext.accounts.doctype.sales_invoice_item.sales_invoice_item import SalesInvoiceItem
        from erpnext.crm.doctype.opportunity_item.opportunity_item import OpportunityItem
        from frappe.types import DF
        from personalized_content.personalized_content.doctype.offering_item.offering_item import OfferingItem
        from personalized_content.personalized_content.doctype.sales_order_connection.sales_order_connection import SalesOrderConnection

        amended_from: DF.Link | None
        amount: DF.Currency
        cart_item: DF.Table[OpportunityItem]
        content: DF.TextEditor | None
        customer: DF.Link
        customer_id: DF.Data | None
        explaination: DF.SmallText | None
        offering_item: DF.Table[OfferingItem]
        sales_invoice_item: DF.Table[SalesInvoiceItem]
        sales_order_connection: DF.Table[SalesOrderConnection]
        status: DF.Literal["Draft", "Submitted", "Approved"]
    # end: auto-generated types
    pass

    @frappe.whitelist()
    def get_connection_counts(self):
        counts = {}
        target = self.target
        target_type = self.target_type

        if not target or not target_type:
            return counts

        # Đếm số lượng Customer hoặc Customer Group
        if target_type == 'Customer':
            counts['Customer'] = frappe.db.count('Customer', {'name': target})
            # Đếm số lượng Customer Group
            customer_group = frappe.db.get_value('Customer', target, 'customer_group')
            if customer_group:
                counts['Customer Group'] = frappe.db.count('Customer Group', {'name': customer_group})
            else:
                counts['Customer Group'] = 0

            # Đếm số lượng Sales Order, Delivery Note, Sales Invoice
            counts['Sales Order'] = frappe.db.count('Sales Order', {'customer': target})
            counts['Delivery Note'] = frappe.db.count('Delivery Note', {'customer': target})
            counts['Sales Invoice'] = frappe.db.count('Sales Invoice', {'customer': target})

            # Đếm số lượng Opportunity, Quotation
            counts['Opportunity'] = frappe.db.count('Opportunity', {'customer_name': target})
            counts['Quotation'] = frappe.db.count('Quotation', {'customer_name': target})
        elif target_type == 'Customer Group':
            counts['Customer Group'] = frappe.db.count('Customer Group', {'name': target})
            counts['Customer'] = 0
            # Các doctype khác không áp dụng trực tiếp cho Customer Group, đặt giá trị 0
            counts['Sales Order'] = 0
            counts['Delivery Note'] = 0
            counts['Sales Invoice'] = 0
            counts['Opportunity'] = 0
            counts['Quotation'] = 0

        # Đếm số lượng Campaign
        counts['Campaign'] = frappe.db.count('Campaign', {'campaign_name': self.campaign_name or ''})

        # Đếm số lượng Sales Order Connection
        counts['Sales Order Connection'] = frappe.db.count('Sales Order Connection', {'item': self.item or ''})

        # Đếm số lượng Promotional Scheme
        counts['Promotional Scheme'] = frappe.db.count('Promotional Scheme', {'apply_on': 'Transaction'})

        return counts

@frappe.whitelist()
def get_item_image(item_code):
    """
    Lấy URL ảnh từ DocType Item dựa trên item_code.
    """
    if not item_code:
        return {'image_url': ''}

    image_url = frappe.db.get_value('Item', item_code, 'image') or ''
    frappe.log_error(f"get_item_image - Item Code: {item_code}, Image URL: {image_url}", "Debug")
    return {'image_url': image_url}

# @frappe.whitelist()
# def get_customer_image(customer_name):
#     """
#     Lấy URL ảnh từ DocType Customer dựa trên customer_name.
#     """
#     if not customer_name:
#         return {'image_url': ''}

#     image_url = frappe.db.get_value('Customer', customer_name, 'image') or ''
#     frappe.log_error(f"get_customer_image - Customer Name: {customer_name}, Image URL: {image_url}", "Debug")
#     return {'image_url': image_url}

@frappe.whitelist()
def get_item_images(item_codes):
    """
    Lấy URL ảnh cho nhiều items từ DocType Item.
    """
    import json

    # Kiểm tra và parse item_codes nếu là chuỗi JSON
    if isinstance(item_codes, str):
        try:
            item_codes = json.loads(item_codes)
            print(f"get_item_images - Parsed item_codes from string: {item_codes}")
        except json.JSONDecodeError as e:
            print(f"get_item_images - Failed to parse item_codes from string: {item_codes}, Error: {str(e)}")
            return []

    # Kiểm tra dữ liệu đầu vào
    if not item_codes or not isinstance(item_codes, list):
        print(f"get_item_images - Invalid item_codes: {item_codes}")
        return []

    # Đảm bảo không có giá trị trùng lặp
    item_codes = list(set(item_codes))
    print(f"get_item_images - Fetching images for items: {item_codes}")

    # Kiểm tra xem item_codes có tồn tại trong doctype Item không
    existing_items = frappe.db.get_all('Item', filters={'name': ['in', item_codes]}, fields=['name'])
    existing_item_codes = [item.name for item in existing_items]
    print(f"get_item_images - Existing item codes in DB: {existing_item_codes}")

    # Kiểm tra item_codes không tồn tại
    missing_items = [item_code for item_code in item_codes if item_code not in existing_item_codes]
    if missing_items:
        print(f"get_item_images - Item codes not found in DB: {missing_items}")

    # Truy vấn tất cả ảnh cùng lúc
    try:
        items = frappe.get_all(
            'Item',
            filters={'name': ['in', item_codes]},
            fields=['name', 'image']
        )
        print(f"get_item_images - Raw items from DB: {items}")
    except Exception as e:
        print(f"get_item_images - Error fetching items: {str(e)}")
        return []

    # Tạo danh sách kết quả theo thứ tự của item_codes
    result = []
    item_dict = {}
    for item in items:
        if item.image:
            item_dict[item.name] = item.image
        else:
            print(f"get_item_images - Item {item.name} has no image field value")

    for item_code in item_codes:
        image_url = item_dict.get(item_code, '')
        if image_url:
            result.append({'item_code': item_code, 'image_url': image_url})
        else:
            print(f"get_item_images - No image found for item: {item_code}")

    # Rút ngắn chuỗi log để tránh vượt quá giới hạn ký tự
    print(f"get_item_images - Final result count: {len(result)} items")
    return result