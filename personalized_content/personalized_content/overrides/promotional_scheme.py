from erpnext.accounts.doctype.promotional_scheme.promotional_scheme import PromotionalScheme
from frappe import _
import frappe
import json
import logging

logger = logging.getLogger(__name__)

class PromotionalScheme(PromotionalScheme):
    @staticmethod
    @frappe.whitelist()
    def get_personalized_content_data_for_content_whitelisted():
        # Lấy tất cả bản ghi Personalized Content với status = Draft, không giới hạn số lượng
        personalized_contents = frappe.get_all(
            'Personalized Content',
            filters={'docstatus': 0},
            fields=['name', 'target', 'target_type'],
            limit=None  # Bỏ giới hạn số lượng bản ghi
        )

        print(f"Fetched {len(personalized_contents)} Personalized Content records with status Draft")
        print(f"Length of personalized_contents: {len(personalized_contents)}")
        
        print(f"Total Personalized Content records with status Draft: {len(personalized_contents)}")
        print("Personalized Content records:", personalized_contents)

        data = []
        for pc in personalized_contents:
            try:
                pc_doc = frappe.get_doc('Personalized Content', pc.name)
                customer_display = ''
                customer_type_display = pc.target_type or ''
                customer_group = ''

                if pc.target and pc.target_type:
                    fieldname = 'customer_name' if pc.target_type == 'Customer' else 'customer_group_name'
                    try:
                        # Kiểm tra xem target có tồn tại trong doctype tương ứng không
                        if frappe.db.exists(pc.target_type, pc.target):
                            display_value = frappe.db.get_value(pc.target_type, pc.target, fieldname)
                            customer_display = display_value or pc.target
                        else:
                            customer_display = f"{pc.target} (Not Found)"
                            frappe.log_error(f"Target {pc.target} of type {pc.target_type} does not exist for Personalized Content {pc.name}")
                    except Exception as e:
                        frappe.log_error(f"Error fetching display for {pc.name}: {str(e)}")
                        customer_display = f"{pc.target} (Error)"

                    if pc.target_type == 'Customer':
                        try:
                            if frappe.db.exists('Customer', pc.target):
                                customer_group = frappe.db.get_value('Customer', pc.target, 'customer_group') or ''
                            else:
                                customer_group = ''
                                frappe.log_error(f"Customer {pc.target} does not exist for Personalized Content {pc.name}")
                        except Exception as e:
                            frappe.log_error(f"Error fetching customer_group for {pc.name}: {str(e)}")
                            customer_group = ''

                # Lấy ảnh từ Offering Item với item_code
                offering_item_images = []
                if pc_doc.offering_item:
                    for item in pc_doc.offering_item:
                        if item.item:
                            image_url = frappe.db.get_value('Item', item.item, 'image') or ''
                            if image_url:
                                offering_item_images.append(f'<img src="{image_url}" data-item-image="true" data-item-code="{item.item}" style="max-width: 150px;">')

                # Gộp mảng thành chuỗi HTML
                offering_item_images_str = ''.join(offering_item_images) if offering_item_images else ''

                print(f"Fetching Personalized Content {pc.name}: offering_item_images = {offering_item_images_str}")

                data.append({
                    'name': pc_doc.name,
                    'customer_display': customer_display or 'Unknown Target',
                    'customer_type_display': customer_type_display,
                    'target_type': pc_doc.target_type,
                    'target': pc_doc.target,
                    'customer_group': customer_group,
                    'amount': pc_doc.amount or 0,
                    'content': pc_doc.content or '',
                    'offering_item_images': offering_item_images_str,
                    'sales_order_connection': pc_doc.sales_order_connection or []
                })
            except Exception as e:
                frappe.log_error(f"Error processing Personalized Content {pc.name}: {str(e)}")
                continue

        print(f"Total records after processing: {len(data)}")
        return data

    @staticmethod
    @frappe.whitelist()
    def process_selected_personalized_content_whitelisted(selected_ids):
        if not selected_ids:
            frappe.throw(_('No Personalized Content selected.'))

        logger.info(f"Received selected_ids: {selected_ids}")

        if isinstance(selected_ids, str):
            try:
                selected_ids = json.loads(selected_ids)
            except json.JSONDecodeError:
                frappe.throw(_('Invalid format for selected_ids. Expected a list or JSON array.'))
        if not isinstance(selected_ids, list):
            frappe.throw(_('Invalid format for selected_ids. Expected a list.'))

        customers = set()
        customer_groups = set()
        target_types = set()
        custom_personalized_content_detail = []

        for pc_id in selected_ids:
            try:
                pc_doc = frappe.get_doc('Personalized Content', pc_id)
                if pc_doc.target_type and pc_doc.target:
                    target_types.add(pc_doc.target_type)
                    if pc_doc.target_type == 'Customer':
                        customers.add(pc_doc.target)
                    elif pc_doc.target_type == 'Customer Group':
                        customer_groups.add(pc_doc.target)

                customer_display = pc_doc.target or ''
                if pc_doc.target and pc_doc.target_type:
                    fieldname = 'customer_name' if pc_doc.target_type == 'Customer' else 'customer_group_name'
                    display_value = frappe.db.get_value(pc_doc.target_type, pc_doc.target, fieldname)
                    if display_value:
                        customer_display = display_value

                # Lấy ảnh từ Offering Item với item_code
                offering_item_images = []
                if pc_doc.offering_item:
                    for item in pc_doc.offering_item:
                        if item.item:
                            image_url = frappe.db.get_value('Item', item.item, 'image') or ''
                            if image_url:
                                offering_item_images.append(f'<img src="{image_url}" data-item-image="true" data-item-code="{item.item}" style="max-width: 150px;">')

                # Gộp mảng thành chuỗi HTML
                offering_item_images_str = ''.join(offering_item_images) if offering_item_images else ''

                print(f"Processing Personalized Content {pc_id}: offering_item_images = {offering_item_images_str}")

                custom_personalized_content_detail.append({
                    'id': pc_doc.name,
                    'customer': customer_display,  # Sử dụng customer_display thay vì pc_doc.customer
                    'target_type': pc_doc.target_type,  # Thêm trường target_type
                    'content': pc_doc.content or 'N/A',
                    'offering_item_images': offering_item_images_str
                })
            except frappe.DoesNotExistError:
                logger.error(f"Personalized Content {pc_id} not found.")
                frappe.throw(_('Personalized Content {0} not found').format(pc_id))
            except Exception as e:
                logger.error(f"Error processing Personalized Content {pc_id}: {str(e)}")
                continue

        if not target_types:
            frappe.throw(_('No valid target type found in selected Personalized Content.'))

        if len(target_types) > 1:
            frappe.throw(_('Please select only one type: either Customer or Customer Group.'))

        applicable_for = 'Customer' if 'Customer' in target_types else 'Customer Group'

        result = {
            'selling': 1,
            'apply_on': 'Transaction',
            'applicable_for': applicable_for,
            'customer': [],
            'customer_group': [],
            'custom_personalized_content_detail': custom_personalized_content_detail
        }

        if applicable_for == 'Customer':
            for customer in customers:
                customer_name = frappe.db.get_value('Customer', customer, 'customer_name') or customer
                result['customer'].append({
                    'customer': customer,
                    'customer_name': customer_name
                })
            return {
                'message': _('Customers fetched successfully from Personalized Content.'),
                'data': result
            }
        elif applicable_for == 'Customer Group':
            for customer_group in customer_groups:
                customer_group_name = frappe.db.get_value('Customer Group', customer_group, 'customer_group_name') or customer_group
                result['customer_group'].append({
                    'customer_group': customer_group,
                    'customer_group_name': customer_group_name
                })
            return {
                'message': _('Customer Groups fetched successfully from Personalized Content.'),
                'data': result
            }

        return {
            'message': _('No applicable Customer or Customer Group found.'),
            'data': result
        }

    @staticmethod
    @frappe.whitelist()
    def show_personalized_content_dialog_for_content():
        dialog = frappe._dict({
            'title': _('Select Personalized Content'),
            'size': 'large',
            'fields': [
                {
                    'label': _('Source'),
                    'fieldname': 'content_source',
                    'fieldtype': 'HTML'
                },
                {
                    'fieldtype': 'Section Break',
                    'label': _('Basket Value Range')
                },
                {
                    'label': _('From (VND)'),
                    'fieldname': 'price_from',
                    'fieldtype': 'Float',
                    'default': 0,
                    'description': _('Use 0 to show all.')
                },
                {
                    'fieldtype': 'Column Break'
                },
                {
                    'label': _('To (VND)'),
                    'fieldname': 'price_to',
                    'fieldtype': 'Float',
                    'default': 0,
                    'description': _('Use 0 to show all.')
                },
                {
                    'fieldtype': 'Section Break'
                },
                {
                    'label': _('Customer Name'),
                    'fieldname': 'customer_name_filter',
                    'fieldtype': 'Link',
                    'options': 'Customer',
                    'description': _('Filter by customer name when Source is Customer.')
                },
                {
                    'fieldtype': 'Column Break'
                },
                {
                    'label': _('Customer Group'),
                    'fieldname': 'customer_group_filter',
                    'fieldtype': 'Link',
                    'options': 'Customer Group',
                    'description': _('Filter by customer group when Source is Customer Group.')
                },
                {
                    'fieldtype': 'Section Break'
                },
                {
                    'label': _('Personalized Content List'),
                    'fieldname': 'personalized_content_list',
                    'fieldtype': 'HTML'
                }
            ],
            'primary_action_label': _('Get Content'),
            'primary_action': 'personalized_content.personalized_content.overrides.promotional_scheme.process_selected_personalized_content_whitelisted'
        })
        return dialog

@frappe.whitelist()
def get_personalized_content_data_for_content_whitelisted():
    return PromotionalScheme.get_personalized_content_data_for_content_whitelisted()

@frappe.whitelist()
def process_selected_personalized_content_whitelisted(selected_ids):
    return PromotionalScheme.process_selected_personalized_content_whitelisted(selected_ids)

@frappe.whitelist()
def show_personalized_content_dialog_for_content():
    return PromotionalScheme.show_personalized_content_dialog_for_content()