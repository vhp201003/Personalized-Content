frappe.ui.form.on('Personalized Content', {
    refresh: function(frm) {
        // Thiết lập get_query cho trường Target Type để giới hạn chỉ chọn Customer hoặc Customer Group
        frm.fields_dict['target_type'].get_query = function() {
            return {
                filters: {
                    name: ['in', ['Customer', 'Customer Group']]
                }
            };
        };

        // Thiết lập get_query cho trường Target khi form được tải
        frm.fields_dict['target'].get_query = function() {
            let target_type = frm.doc.target_type;
            if (!target_type) {
                frappe.msgprint(__('Please select a Target Type before selecting Target.'));
                return {};
            }
            return {
                doctype: target_type
            };
        };

        // Tính tổng Amount từ Offering Item khi form được tải
        const calculateTotalAmount = () => {
            let totalAmount = 0;
            if (frm.doc.offering_item) {
                frm.doc.offering_item.forEach(row => {
                    totalAmount += parseFloat(row.amount) || 0;
                });
            }
            frm.set_value('amount', totalAmount);
        };
        calculateTotalAmount();

        // Gọi hàm hiển thị số lượng khi tab Connection được hiển thị
        if (!frm.doc.__islocal) {
            setupConnectionTabListener(frm);
        }

        const renderPreviewContent = () => {
            // Kiểm tra dữ liệu đầu vào
            if (!frm.doc.content && (!frm.doc.offering_item || frm.doc.offering_item.length === 0)) {
                console.log('No content or offering items to render.');
                frm.set_value('preview_content', '<p>No content or images to display.</p>');
                return;
            }
        
            // Log để kiểm tra dữ liệu
            console.log('Content:', frm.doc.content);
            console.log('Offering Items:', frm.doc.offering_item);
        
            // Lấy nội dung từ content
            let content = frm.doc.content || 'N/A';
        
            // Lấy danh sách item_code từ offering_item
            let item_codes = [];
            if (frm.doc.offering_item && frm.doc.offering_item.length > 0) {
                item_codes = frm.doc.offering_item.map(row => {
                    console.log('Offering Item Row:', row); // Log từng hàng
                    return row.item;
                }).filter(item => item);
            }
            console.log('Item Codes:', item_codes);
            console.log('Type of Item Codes before sending:', typeof item_codes); // Log kiểu dữ liệu
        
            // Gọi API để lấy ảnh từ item_codes
            frappe.call({
                method: 'personalized_content.personalized_content.doctype.personalized_content.personalized_content.get_item_images',
                args: {
                    item_codes: item_codes
                },
                callback: function(r) {
                    console.log('API Response for item images:', r.message);
                    let imagesHtml = '';
                    if (r.message && r.message.length > 0) {
                        imagesHtml = r.message.map(item => {
                            console.log('Item Image:', item); // Log từng hình ảnh
                            return `<a href="/app/item/${item.item_code}" target="_blank"><img src="${item.image_url}" style="max-width: 100px; margin: 5px;" alt="${item.item_code}" data-item-code="${item.item_code}"></a>`;
                        }).join('');
                    } else {
                        console.log('No images found for the given item codes.');
                    }
        
                    // Gộp nội dung và hình ảnh từ offering_item
                    let previewHtml = `
                        <div>${content}</div>
                        ${imagesHtml ? '<div style="margin-top: 10px;">' + imagesHtml + '</div>' : '<p>No images available.</p>'}
                    `;
        
                    // Log nội dung preview trước khi lưu
                    console.log('Preview HTML before setting:', previewHtml);
        
                    // Lưu nội dung preview vào trường preview_content (không tự động lưu form)
                    frm.set_value('preview_content', previewHtml);
                },
                error: function(err) {
                    console.error('Error fetching item images:', err);
                    frappe.msgprint(__('Error fetching item images: ') + err.message);
                    frm.set_value('preview_content', '<p>Error loading preview content.</p>');
                }
            });
        };
        renderPreviewContent();
    },

    target_type: function(frm) {
        frm.set_value('target', '');
        frm.refresh_field('target');
    },
});

// Thiết lập listener cho tab Connection
function setupConnectionTabListener(frm) {
    const connectionTab = $('a[data-toggle="tab"][href="#personalized-content-connection_tab"]');
    if (!connectionTab.length) {
        console.log("Connection tab not found in tab navigation");
        return;
    }

    connectionTab.off('shown.bs.tab');
    connectionTab.on('shown.bs.tab', function() {
        console.log("Connection tab shown, displaying counts...");
        displayConnectionCounts(frm);
    });

    if (connectionTab.parent().hasClass('active')) {
        console.log("Connection tab is active on load, displaying counts...");
        displayConnectionCounts(frm);
    }
}

// Hàm hiển thị số lượng cho tất cả các liên kết trong tab Connection
function displayConnectionCounts(frm) {
    const target = frm.doc.target;
    const target_type = frm.doc.target_type;
    if (!target || !target_type) {
        console.log('No target specified in Personalized Content');
        return;
    }

    const connectionPaneHtml = $('#personalized-content-connection_tab').html();
    console.log("Connection pane HTML structure:", connectionPaneHtml);

    let displayAttempts = 0;
    const maxDisplayAttempts = 30;
    const displayInterval = 500;

    const tryDisplayConnectionCounts = () => {
        let connection_tab_pane = $('#personalized-content-connection_tab');

        if (!connection_tab_pane.length) {
            console.log("Connection tab pane not found");
            if (displayAttempts < maxDisplayAttempts) {
                displayAttempts++;
                setTimeout(tryDisplayConnectionCounts, displayInterval);
            } else {
                console.log(`Failed to display connection counts after ${displayAttempts} attempts`);
                frappe.msgprint(__('Failed to display connection counts: Connection tab pane not found. Please check the DOM log.'));
            }
            return;
        }

        connection_tab_pane.find('[class*="custom-count-"]').remove();

        const documentLinks = connection_tab_pane.find('div.document-link');
        if (!documentLinks.length) {
            console.log("No document links found in Connection tab");
            if (displayAttempts < maxDisplayAttempts) {
                displayAttempts++;
                setTimeout(tryDisplayConnectionCounts, displayInterval);
            } else {
                console.log(`Failed to display connection counts after ${displayAttempts} attempts`);
                frappe.msgprint(__('Failed to display connection counts: No document links found in Connection tab.'));
            }
            return;
        }

        documentLinks.each(function() {
            const link = $(this);
            const doctype = link.attr('data-doctype');
            const badgeLink = link.find('a.badge-link');

            if (!doctype || !badgeLink.length) {
                console.log(`Invalid document link for doctype: ${doctype}`);
                return;
            }

            let filters = {};
            if (doctype === 'Customer' && target_type === 'Customer') {
                filters = { name: target };
            } else if (doctype === 'Customer Group' && target_type === 'Customer Group') {
                filters = { name: target };
            } else if (doctype === 'Customer Group' && target_type === 'Customer') {
                frappe.call({
                    method: 'frappe.client.get_value',
                    args: {
                        doctype: 'Customer',
                        filters: { name: target },
                        fieldname: 'customer_group'
                    },
                    callback: function(r) {
                        if (r.message && r.message.customer_group) {
                            displayCount(doctype, badgeLink, { name: r.message.customer_group }, connection_tab_pane);
                        }
                    }
                });
                return;
            } else if (['Sales Order', 'Delivery Note', 'Sales Invoice'].includes(doctype) && target_type === 'Customer') {
                filters = { customer: target };
            } else if (['Opportunity', 'Quotation'].includes(doctype) && target_type === 'Customer') {
                filters = { customer_name: target };
            } else if (doctype === 'Campaign') {
                filters = { campaign_name: frm.doc.campaign_name || '' };
            } else if (doctype === 'Sales Order Connection') {
                filters = { item: frm.doc.item || '' };
            } else if (doctype === 'Promotional Scheme') {
                filters = { apply_on: 'Transaction' };
            } else {
                console.log(`Unsupported doctype for counting: ${doctype}`);
                return;
            }

            displayCount(doctype, badgeLink, filters, connection_tab_pane);
        });
    };

    frappe.after_ajax(() => {
        tryDisplayConnectionCounts();
    });
}

// Hàm đếm và hiển thị số lượng cho một DocType
function displayCount(doctype, badgeLink, filters, connection_tab_pane) {
    frappe.call({
        method: 'frappe.client.get_list',
        args: {
            doctype: doctype,
            filters: filters,
            fields: ['name'],
            limit_page_length: 0
        },
        callback: function(r) {
            if (r.message) {
                const count = r.message.length;
                console.log(`Found ${count} records for doctype: ${doctype}`);

                let count_html = `
                    <style>
                        .custom-count-${doctype} {
                            margin-left: 0px;
                            color: #555;
                            font-size: 13px;
                        }
                    </style>
                    <span class="custom-count-${doctype}">[${count}]</span>
                `;

                badgeLink.parent().append(count_html);
            } else {
                console.log(`No records found for doctype: ${doctype}`);
            }
        },
        error: function(err) {
            console.error(`Error fetching records for doctype ${doctype}:`, err);
            frappe.msgprint(__('Error fetching records for doctype ') + doctype + ': ' + err.message);
        }
    });
}

// Tự động tính Amount cho Offering Item và cập nhật tổng Amount
frappe.ui.form.on('Offering Item', {
    quantity: function(frm, cdt, cdn) {
        const row = locals[cdt][cdn];
        if (row.quantity && row.rate) {
            const amount = flt(row.quantity) * flt(row.rate);
            frappe.model.set_value(cdt, cdn, 'amount', amount);
        }
        let totalAmount = 0;
        if (frm.doc.offering_item) {
            frm.doc.offering_item.forEach(item => {
                totalAmount += parseFloat(item.amount) || 0;
            });
        }
        frm.set_value('amount', totalAmount);
    },
    rate: function(frm, cdt, cdn) {
        const row = locals[cdt][cdn];
        if (row.quantity && row.rate) {
            const amount = flt(row.quantity) * flt(row.rate);
            frappe.model.set_value(cdt, cdn, 'amount', amount);
        }
        let totalAmount = 0;
        if (frm.doc.offering_item) {
            frm.doc.offering_item.forEach(item => {
                totalAmount += parseFloat(item.amount) || 0;
            });
        }
        frm.set_value('amount', totalAmount);
    },
    item: function(frm, cdt, cdn) {
        const row = locals[cdt][cdn];
        console.log('Item changed:', row.item);
        // Không thêm ảnh tự động vào content nữa
    }
});

// Tự động tính Amount cho Sales Order Connection
frappe.ui.form.on('Sales Order Connection', {
    quantity: function(frm, cdt, cdn) {
        const row = locals[cdt][cdn];
        if (row.quantity && row.rate) {
            const amount = flt(row.quantity) * flt(row.rate);
            frappe.model.set_value(cdt, cdn, 'amount', amount);
        }
    },
    rate: function(frm, cdt, cdn) {
        const row = locals[cdt][cdn];
        if (row.quantity && row.rate) {
            const amount = flt(row.quantity) * flt(row.rate);
            frappe.model.set_value(cdt, cdn, 'amount', amount);
        }
    }
});