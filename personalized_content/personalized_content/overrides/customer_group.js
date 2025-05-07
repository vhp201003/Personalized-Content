frappe.ui.form.on('Customer Group', {
    refresh: function(frm) {
        console.log('Customer Group Form Loaded');

        // Load danh sách Customer trong nhóm
        frappe.call({
            method: 'frappe.client.get_list',
            args: {
                doctype: 'Customer',
                filters: {'customer_group': frm.doc.name},
                fields: ['name', 'customer_name', 'customer_group', 'customer_type', 'territory', 'email_id', 'mobile_no']
            },
            callback: function(r) {
                frm.clear_table('custom_customer_group_member');
                let customers = r.message || [];
                customers.forEach(customer => {
                    let row = frm.add_child('custom_customer_group_member');
                    row.customer = customer.name;
                    row.customer_name = customer.customer_name;
                    row.customer_group = customer.customer_group;
                    row.customer_type = customer.customer_type;
                    row.territory = customer.territory;
                    row.email_id = customer.email_id;
                    row.mobile_no = customer.mobile_no;
                });
                frm.refresh_field('custom_customer_group_member');

                // Load danh sách Personalized Content trực tiếp cho Customer Group
                frappe.call({
                    method: 'frappe.client.get_list',
                    args: {
                        doctype: 'Personalized Content',
                        filters: {
                            'target_type': 'Customer Group',
                            'target': frm.doc.name  // Sử dụng frm.doc.name
                        },
                        fields: ['name', 'target', 'content', 'status', 'date_time', 'amount']
                    },
                    callback: function(res) {
                        let personalizedContentsForGroup = res.message || [];
                        console.log('Personalized Content for Customer Group:', personalizedContentsForGroup);

                        // Hiển thị danh sách Personalized Content chỉ từ Customer Group
                        frm.clear_table('custom_personalized_contents');
                        personalizedContentsForGroup.forEach(content => {
                            let row = frm.add_child('custom_personalized_contents');
                            row.target = content.target; // target là name của Customer Group
                            row.personalized_content = content.name;
                            row.content = content.content;
                            row.status = content.status;
                            row.date_time = content.date_time;
                            row.amount = content.amount;
                        });
                        frm.refresh_field('custom_personalized_contents');
                    }
                });
            }
        });
    }
});

frappe.ui.form.on('Customer Group Personalized Content', {
    custom_personalized_contents: function(frm) {
        frm.fields_dict['custom_personalized_contents'].grid.get_field('personalized_content').get_query = function() {
            return {
                formatter: function(value, row, column, data) {
                    if (data.personalized_content) {
                        return `<a href="/app/personalized-content/${data.personalized_content}" onclick="frappe.set_route('Form', 'Personalized Content', '${data.personalized_content}'); return false;">${value}</a>`;
                    }
                    return value;
                }
            };
        };
        frm.fields_dict['custom_personalized_contents'].grid.get_field('target').get_query = function() {
            return {
                formatter: function(value, row, column, data) {
                    if (data.target) {
                        // Kiểm tra xem target là Customer hay Customer Group
                        let linkDoctype = frm.doc.name === data.target ? 'Customer Group' : 'Customer';
                        return `<a href="/app/${linkDoctype.toLowerCase()}/${data.target}" onclick="frappe.set_route('Form', '${linkDoctype}', '${data.target}'); return false;">${value}</a>`;
                    }
                    return value;
                }
            };
        };
    }
});