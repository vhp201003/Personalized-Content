frappe.ui.form.on('Customer', {
    refresh: function(frm) {
        console.log('Customer Form Loaded');
        frappe.call({
            method: 'frappe.client.get_list',
            args: {
                doctype: 'Personalized Content',
                filters: {
                    'target_type': 'Customer',
                    'target': frm.doc.customer_name // Sử dụng customer_name thay vì name
                },
                fields: ['name', 'content', 'status', 'date_time', 'amount']
            },
            callback: function(r) {
                console.log('Personalized Content for Customer:', r.message);
                frm.clear_table('custom_personalized_contents');
                if (r.message) {
                    r.message.forEach(content => {
                        let row = frm.add_child('custom_personalized_contents');
                        row.personalized_content = content.name;
                        row.content = content.content;
                        row.status = content.status;
                        row.date_time = content.date_time;
                        row.amount = content.amount;
                    });
                }
                frm.refresh_field('custom_personalized_contents');
            }
        });
    }
});

frappe.ui.form.on('Customer Personalized Content', {
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
    }
});