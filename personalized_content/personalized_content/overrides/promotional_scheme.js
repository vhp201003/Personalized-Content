frappe.ui.form.on('Promotional Scheme', {
    refresh: function (frm) {
        let selected_rows = [];
        let deletedTable = null;

        // Khôi phục selected_rows từ custom_personalized_content_detail khi load form
        if (frm.doc.custom_personalized_content_detail && frm.doc.custom_personalized_content_detail.length > 0) {
            selected_rows = frm.doc.custom_personalized_content_detail.map(row => ({
                id: row.id,
                target: row.target,
                content: row.content,
                offering_item_images: row.offering_item_images || ''
            }));
            console.log('Restored selected_rows:', selected_rows);
        }

        // Thêm FontAwesome nếu chưa có
        if (!$('link[href*="font-awesome"]').length) {
            $('<link>')
                .attr('rel', 'stylesheet')
                .attr('href', 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css')
                .appendTo('head');
        }

        // Thêm nút Get Content From
        frm.add_custom_button(__('Get Content From'), function () {
            fetchContent(frm);
        });

        // Hàm render cột Content và Target
        function renderContentColumn() {
            if (!frm.fields_dict.custom_personalized_content_detail) {
                console.warn('Child Table custom_personalized_content_detail not found');
                return;
            }
        
            let grid = frm.fields_dict.custom_personalized_content_detail.grid;
            setTimeout(() => {
                grid.wrapper.find('.grid-body .grid-row').each(function () {
                    let $row = $(this);
                    let row_name = $row.attr('data-name');
                    let row = frm.doc.custom_personalized_content_detail.find(r => r.name === row_name);
                    if (!row) return;
        
                    let content = row.content || 'N/A';
                    let target = row.target || selected_rows.find(sr => sr.id === row.id)?.target || 'Unknown Target';
                    console.log('Rendering row:', { row_name, target, content });
        
                    let tempDiv = document.createElement('div');
                    tempDiv.innerHTML = content;
                    let contentText = (tempDiv.textContent || tempDiv.innerText || '').trim();
                    let maxLength = 20;
                    let previewText = contentText.length > maxLength
                        ? contentText.substring(0, maxLength) + '...'
                        : contentText;
        
                    let $contentCell = $row.find('[data-fieldname="content"] .static-area');
                    if ($contentCell.length) {
                        let $button = $contentCell.find('.custom-detail-btn');
                        if (!$button.length) {
                            $contentCell.html(`
                                <span style="vertical-align: middle;">${previewText}</span>
                                <button class="btn btn-xs custom-detail-btn" onclick="showContentDetail('${row_name}', this)" style="margin-left: 8px; padding: 3px 6px; border: 1px solid #00000; border-radius: 3px; color: #00000; vertical-align: middle; transition: border-color 0.3s, background-color: 0.3s, color: 0.3s;">
                                    <i class="fas fa-info-circle"></i>
                                </button>
                            `);
                        } else {
                            $button.remove();
                            $contentCell.append(`
                                <button class="btn btn-xs custom-detail-btn" onclick="showContentDetail('${row_name}', this)" style="margin-left: 8px; padding: 3px 6px; border: 1px solid #00000; border-radius: 3px; color: #00000; vertical-align: middle; transition: border-color: 0.3s, background-color: 0.3s, color: 0.3s;">
                                    <i class="fas fa-info-circle"></i>
                                </button>
                            `);
                        }
        
                        $contentCell.find('.custom-detail-btn').hover(
                            function () { $(this).css({ 'border-color': '#0056b3', 'background-color': '#e7f1ff', 'color': '#0056b3' }); },
                            function () { $(this).css({ 'border-color': '#00000', 'background-color': 'transparent', 'color': '#00000' }); }
                        );
        
                        $contentCell.addClass('read-only-field').attr('readonly', true);
                    }
        
                    let $targetCell = $row.find('[data-fieldname="target"] .static-area');
                    if ($targetCell.length) {
                        $targetCell.html(`<span title="${target}" style="cursor: pointer;">${target.substring(0, 20)}${target.length > 20 ? '...' : ''}</span>`);
                    }
        
                    $row.find('.grid-static-col').off('click').css('pointer-events', 'none');
                    $contentCell.find('.custom-detail-btn').css('pointer-events', 'auto');
                });
            }, 500);
        }

        // Hàm hiển thị nội dung chi tiết
        window.showContentDetail = function (row_name, button) {
            let row = frm.doc.custom_personalized_content_detail.find(r => r.name === row_name);
            if (!row) {
                frappe.msgprint(__('Error: Row not found in custom_personalized_content_detail.'));
                return;
            }

            // Luôn sử dụng row.content (đã bao gồm các đoạn màu xanh và đỏ từ updateContentAutomatically)
            let content = row.content || 'N/A';
            let offeringItemImages = row.offering_item_images || '';
            console.log('Row data:', row);
            console.log('Content for dialog:', content);
            console.log('Offering Item Images:', offeringItemImages);

            if (!content || content === 'N/A') {
                content = '<p>No content available.</p>';
            }

            let d = new frappe.ui.Dialog({
                title: __('Content Detail'),
                size: 'large',
                fields: [
                    {
                        fieldtype: 'HTML',
                        fieldname: 'content_detail',
                        options: `
                            <div class="ql-editor read-mode" style="padding: 15px; margin: 0; background-color: #f9f9f9; border: 1px solid #d1d8dd; border-radius: 4px;">
                                <style>
                                    .ql-editor.read-mode {
                                        text-indent: 0 !important;
                                        width: 100%;
                                        box-sizing: border-box;
                                    }
                                    .ql-editor.read-mode p, .ql-editor.read-mode ul, .ql-editor.read-mode ol {
                                        margin: 0 0 10px 0 !important;
                                        padding: 0 0 0 10px !important;
                                    }
                                    .ql-editor.read-mode li {
                                        margin: 0 0 5px 0 !important;
                                        padding: 0 !important;
                                    }
                                    .ql-editor.read-mode .discount-content {
                                        margin: 10px 0 !important;
                                        padding: 10px !important;
                                        width: 100%;
                                        box-sizing: border-box;
                                    }
                                    .ql-editor.read-mode .discount-content br {
                                        display: block;
                                        margin: 8px 0;
                                        line-height: 1.5;
                                    }
                                    .ql-editor.read-mode .discount-content-text {
                                        margin: 0 !important;
                                        padding: 0 !important;
                                        display: block;
                                    }
                                    .ql-editor.read-mode .image-container {
                                        display: flex;
                                        flex-wrap: wrap;
                                        gap: 10px;
                                        margin-top: 10px;
                                    }
                                    .ql-editor.read-mode img {
                                        max-width: 150px;
                                        margin: 0;
                                        padding: 0;
                                    }
                                    .ql-editor.read-mode img[data-item-code] {
                                        cursor: pointer;
                                    }
                                </style>
                                <div id="preview-content-container"></div>
                            </div>
                        `
                    }
                ],
                primary_action_label: __('Close'),
                primary_action: function () {
                    d.hide();
                }
            });

            d.$wrapper.find('.modal-dialog').css({
                'max-width': '900px',
                'width': '90%'
            });

            // Gộp nội dung: content từ row (đã bao gồm màu xanh/đỏ) + hình ảnh từ offering_item_images
            let fullContent = `
                <div class="content-section">${content}</div>
                ${offeringItemImages ? '<div class="image-container">' + offeringItemImages + '</div>' : ''}
            `;

            d.show();
            d.$wrapper.find('#preview-content-container').html(fullContent);

            d.$wrapper.find('.ql-editor img[data-item-code]').off('click').on('click', function () {
                let item_code = $(this).data('item-code');
                if (item_code) {
                    frappe.set_route('Form', 'Item', item_code);
                }
            });
        };

        // Thiết lập sự kiện và render ban đầu cho Child Table
        if (frm.fields_dict.custom_personalized_content_detail) {
            let grid = frm.fields_dict.custom_personalized_content_detail.grid;

            let $sectionHead = frm.fields_dict.custom_personalized_content_detail.$wrapper.parent().find('.section-head');
            if ($sectionHead.length && !$sectionHead.find('.refresh-content-btn').length) {
                $sectionHead.append(`
                    <button class="btn btn-xs refresh-content-btn" style="margin-left: 8px; background-color: #000; color: #fff; padding: 3px 6px; border: none; border-radius: 3px; vertical-align: middle;">
                        <i class="fas fa-sync-alt"></i> Refresh
                    </button>
                `);
            }

            frm.fields_dict.custom_personalized_content_detail.$wrapper.parent().on('click', '.refresh-content-btn', function () {
                updateContentAutomatically(frm);
            });

            renderContentColumn();

            grid.wrapper.on('refresh render', function () {
                renderContentColumn();
            });

            frm.fields_dict.custom_personalized_content_detail.$wrapper.on('refresh', renderContentColumn);
        }

        // Theo dõi thay đổi valid_upto
        frm.fields_dict.valid_upto.$input.on('change', function () {
            updateContentAutomatically(frm);
        });

        // Theo dõi xóa hàng trong Price Discount Slabs
        if (frm.fields_dict.price_discount_slabs) {
            frm.fields_dict.price_discount_slabs.grid.wrapper.on('click', '.grid-remove-rows, .grid-remove-all-rows', function () {
                deletedTable = 'price_discount_slabs';
                setTimeout(() => {
                    updateContentAutomatically(frm, deletedTable);
                    deletedTable = null;
                }, 100);
            });
        }

        // Theo dõi xóa hàng trong Product Discount Slabs
        if (frm.fields_dict.product_discount_slabs) {
            frm.fields_dict.product_discount_slabs.grid.wrapper.on('click', '.grid-remove-rows, .grid-remove-all-rows', function () {
                deletedTable = 'product_discount_slabs';
                setTimeout(() => {
                    updateContentAutomatically(frm, deletedTable);
                    deletedTable = null;
                }, 100);
            });
        }

        // Hàm xử lý dialog Get Content From với logic lọc
        function fetchContent(frm) {
            frappe.call({
                method: 'personalized_content.personalized_content.overrides.promotional_scheme.show_personalized_content_dialog_for_content',
                callback: function (r) {
                    console.log('Dialog config response:', r);
                    if (r.message) {
                        let dialog_config = r.message;
                        let d = new frappe.ui.Dialog(dialog_config);
                
                        let all_personalized_contents = [];
                        let selected_source = 'Customer';
                        let last_manual_input = '';
                        let selectedCheckboxes = [];
                
                        // Hàm debounce để tối ưu hiệu suất
                        function debounce(func, wait) {
                            let timeout;
                            return function executedFunction(...args) {
                                const later = () => {
                                    clearTimeout(timeout);
                                    func(...args);
                                };
                                clearTimeout(timeout);
                                timeout = setTimeout(later, wait);
                            };
                        }
                
                        // Thiết lập radio buttons cho nguồn lọc
                        let source_html = `
                            <div style="margin-bottom: 10px;">
                                <label><input type="radio" name="content_source" value="Customer" checked> From Customer Personalized Content</label>
                                <br><br>
                                <label style="margin-left: 0px;"><input type="radio" name="content_source" value="Customer Group"> From Customer Group Personalized Content</label>
                            </div>
                        `;
                        d.fields_dict.content_source.$wrapper.html(source_html);
                
                        // Hàm ẩn/hiện trường customer_name_filter
                        function updateFilterFieldsVisibility() {
                            if (selected_source === 'Customer') {
                                d.fields_dict.customer_name_filter.$wrapper.show();
                                d.fields_dict.customer_group_filter.$wrapper.show();
                            } else {
                                d.fields_dict.customer_name_filter.$wrapper.hide();
                                d.fields_dict.customer_group_filter.$wrapper.show();
                                d.set_value('customer_name_filter', '');
                                last_manual_input = '';
                            }
                        }
                
                        // Gọi ban đầu
                        updateFilterFieldsVisibility();
                
                        // Xử lý thay đổi nguồn lọc
                        $('input[name="content_source"]', d.body).on('change', function () {
                            selected_source = $(this).val();
                            console.log('Source changed:', selected_source);
                            updateFilterFieldsVisibility();
                            renderContentTable(
                                selected_source,
                                d.get_value('customer_name_filter') || last_manual_input,
                                d.get_value('customer_group_filter') || '',
                                d.get_value('price_from'),
                                d.get_value('price_to')
                            );
                            if (selected_source === 'Customer Group') {
                                $('.personalized-content-checkbox').on('change', function () {
                                    if ($(this).is(':checked')) {
                                        $('.personalized-content-checkbox').not(this).prop('checked', false);
                                    }
                                });
                            }
                        });
                
                        // Hàm render bảng với logic lọc
                        function renderContentTable(filter_source, customer_name_filter, customer_group_filter, price_from, price_to) {
                            saveSelectedCheckboxes();
                            let filtered_rows = [];
                            let amount_from = parseFloat(price_from) || 0;
                            let amount_to = parseFloat(price_to) || Infinity;
                            let customer_name_search = (customer_name_filter || '').toLowerCase().trim();
                            let customer_group_search = (customer_group_filter || '').toLowerCase().trim();
                        
                            console.log('Filter inputs:', { filter_source, customer_name_search, customer_group_search, amount_from, amount_to });
                            console.log('Total Personalized Content records before filtering:', all_personalized_contents.length);
                        
                            all_personalized_contents.forEach(pc => {
                                // 1. Lọc theo target_type
                                if (filter_source !== 'All' && pc.target_type !== filter_source) {
                                    return;
                                }
                        
                                // 2. Lọc theo Customer (khi đang ở mode Customer)
                                if (filter_source === 'Customer') {
                                    // 2.1 Lọc theo tên khách hàng
                                    if (customer_name_search &&
                                        !((pc.customer_display || '').toLowerCase().includes(customer_name_search))
                                    ) {
                                        console.log(`Skipping ${pc.name}: customer_display "${pc.customer_display}" ≠ "${customer_name_search}"`);
                                        return;
                                    }
                                    // 2.2 Lọc theo nhóm khách hàng
                                    if (customer_group_search &&
                                        !((pc.customer_group || '').toLowerCase().includes(customer_group_search))
                                    ) {
                                        console.log(`Skipping ${pc.name}: customer_group "${pc.customer_group}" ≠ "${customer_group_search}"`);
                                        return;
                                    }
                                }
                                // 3. Lọc theo Customer Group (giữ logic cũ của bạn)
                                else if (filter_source === 'Customer Group') {
                                    if (customer_group_search &&
                                        !((pc.customer_display || '').toLowerCase().includes(customer_group_search))
                                    ) {
                                        console.log(`Skipping ${pc.name}: customer_display "${pc.customer_display}" ≠ "${customer_group_search}"`);
                                        return;
                                    }
                                }
                        
                                // 4. Lọc theo amount
                                let is_amount_valid = false;
                                const sales_orders = pc.sales_order_connection || [];
                                if (sales_orders.length > 0) {
                                    for (let item of sales_orders) {
                                        let amount = parseFloat(item.amount) || 0;
                                        if ((amount_from === 0 && amount_to === Infinity) ||
                                            (amount >= amount_from && amount <= amount_to)
                                        ) {
                                            is_amount_valid = true;
                                            break;
                                        }
                                    }
                                } else {
                                    let amount = parseFloat(pc.amount) || 0;
                                    if ((amount_from === 0 && amount_to === Infinity) ||
                                        (amount >= amount_from && amount <= amount_to)
                                    ) {
                                        is_amount_valid = true;
                                    }
                                }
                                if (!is_amount_valid) {
                                    console.log(`Skipping ${pc.name}: amount ${pc.amount} không nằm trong ${amount_from}-${amount_to}`);
                                    return;
                                }
                        
                                // 5. Thỏa mãn tất cả điều kiện → thêm vào filtered_rows
                                filtered_rows.push({
                                    name: pc.name,
                                    target_value: pc.customer_display || 'Unknown Target',
                                    target_type_value: pc.target_type || 'N/A',
                                    amount: parseFloat(pc.amount) || (sales_orders.length > 0 ? parseFloat(sales_orders[0].amount) : 0),
                                    content: pc.content || 'N/A'
                                });
                            });
                        
                            console.log('Filtered rows:', filtered_rows);
                        
                            // 6. Build HTML table
                            let table_html = `
                                <style>
                                    .table-container { overflow-x: auto; max-width: 100%; }
                                    table { width: 100%; border-collapse: collapse; min-width: 800px; }
                                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left;
                                              white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                                    th { background-color: #f2f2f2; }
                                    .toggle-select-all { cursor: pointer; }
                                </style>
                                <div class="table-container">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>${filter_source === 'Customer Group' ? '' : '<i class="far fa-square toggle-select-all"></i>'}</th>
                                                <th>ID</th>
                                                <th>Target</th>
                                                <th>Target Type</th>
                                                <th>Amount</th>
                                                <th>Content</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                            `;
                        
                            if (filtered_rows.length > 0) {
                                filtered_rows.forEach(row => {
                                    let tempDiv = document.createElement('div');
                                    tempDiv.innerHTML = row.content;
                                    let contentPreview = (tempDiv.textContent || tempDiv.innerText || '').trim();
                                    let maxLength = 10;
                                    let previewText = contentPreview.length > maxLength
                                        ? contentPreview.substring(0, maxLength) + '...'
                                        : contentPreview;
                        
                                    table_html += `
                                        <tr>
                                            <td><input type="checkbox" class="personalized-content-checkbox" value="${row.name}"></td>
                                            <td>${row.name}</td>
                                            <td>${row.target_value}</td>
                                            <td>${row.target_type_value}</td>
                                            <td>${row.amount} VND</td>
                                            <td>${previewText}</td>
                                        </tr>
                                    `;
                                });
                            } else {
                                table_html += `
                                    <tr>
                                        <td colspan="6" style="text-align: center;">
                                            ${filter_source === 'Customer' ? 'No Target found.' : 'No Customer Group found.'}
                                        </td>
                                    </tr>
                                `;
                            }
                        
                            table_html += `
                                        </tbody>
                                    </table>
                                </div>
                            `;
                        
                            // 7. Render vào dialog và phục hồi checkbox
                            d.fields_dict.personalized_content_list.$wrapper.html(table_html);
                            restoreSelectedCheckboxes();
                        
                            // 8. Thiết lập sự kiện chọn tất cả / chọn đơn lẻ
                            if (filter_source === 'Customer Group') {
                                $('.personalized-content-checkbox').on('change', function () {
                                    if ($(this).is(':checked')) {
                                        $('.personalized-content-checkbox').not(this).prop('checked', false);
                                    }
                                });
                            } else {
                                let isAllSelected = false;
                                $('.toggle-select-all').on('click', function () {
                                    isAllSelected = !isAllSelected;
                                    $('.personalized-content-checkbox').prop('checked', isAllSelected);
                                    $(this).toggleClass('far fa-square fa-check-square');
                                });
                            }
                        }
                        
                
                        function saveSelectedCheckboxes() {
                            selectedCheckboxes = [];
                            $('input.personalized-content-checkbox:checked').each(function() {
                                selectedCheckboxes.push($(this).val());
                            });
                        }
                
                        function restoreSelectedCheckboxes() {
                            $('input.personalized-content-checkbox').each(function() {
                                const value = $(this).val();
                                if (selectedCheckboxes.includes(value)) {
                                    $(this).prop('checked', true);
                                }
                            });
                        }
                
                        function updateFilter(field) {
                            const customer_name_value = d.get_value('customer_name_filter') || '';
                            const customer_group_value = d.get_value('customer_group_filter') || '';
                            console.log('Filter updated:', { field, customer_name_value, customer_group_value });
                
                            if (field === 'customer_name_filter' && customer_name_value) {
                                d.set_value('customer_group_filter', '');
                            } else if (field === 'customer_group_filter' && customer_group_value) {
                                d.set_value('customer_name_filter', '');
                                last_manual_input = '';
                            }
                
                            last_manual_input = customer_name_value;
                            renderContentTable(
                                selected_source,
                                customer_name_value,
                                customer_group_value,
                                d.get_value('price_from'),
                                d.get_value('price_to')
                            );
                        }
                
                        const debouncedRenderContentTable = debounce(updateFilter, 300);
                
                        d.fields_dict.customer_name_filter.$input.on('input', function() {
                            debouncedRenderContentTable('customer_name_filter');
                        });
                
                        d.fields_dict.customer_name_filter.$input.on('awesomplete-selectcomplete', function() {
                            console.log('Target selected from autocomplete:', d.get_value('customer_name_filter'));
                            updateFilter('customer_name_filter');
                        });
                
                        d.fields_dict.customer_group_filter.$input.on('input change', function() {
                            debouncedRenderContentTable('customer_group_filter');
                        });
                
                        d.fields_dict.customer_group_filter.$input.on('awesomplete-selectcomplete', function() {
                            console.log('Customer group selected from autocomplete:', d.get_value('customer_group_filter'));
                            updateFilter('customer_group_filter');
                        });
                
                        d.fields_dict.price_from.$input.on('change', function() {
                            console.log('Price from:', d.get_value('price_from'));
                            renderContentTable(
                                selected_source,
                                d.get_value('customer_name_filter') || last_manual_input,
                                d.get_value('customer_group_filter') || '',
                                d.get_value('price_from'),
                                d.get_value('price_to')
                            );
                        });
                
                        d.fields_dict.price_to.$input.on('change', function() {
                            console.log('Price to:', d.get_value('price_to'));
                            renderContentTable(
                                selected_source,
                                d.get_value('customer_name_filter') || last_manual_input,
                                d.get_value('customer_group_filter') || '',
                                d.get_value('price_from'),
                                d.get_value('price_to')
                            );
                        });
                
                        d.set_primary_action(dialog_config.primary_action_label, function() {
                            let selected_ids = [];
                            $('input.personalized-content-checkbox:checked').each(function() {
                                selected_ids.push($(this).val());
                            });
                        
                            if (selected_ids.length === 0) {
                                frappe.msgprint(__('Please select at least one Personalized Content.'));
                                if (document.activeElement) {
                                    document.activeElement.blur();
                                }
                                d.hide();
                                return;
                            }
                        
                            console.log('Selected IDs:', selected_ids);
                        
                            frappe.call({
                                method: 'personalized_content.personalized_content.overrides.promotional_scheme.process_selected_personalized_content_whitelisted',
                                args: { selected_ids: selected_ids },
                                callback: function(r) {
                                    console.log('Server response:', JSON.stringify(r, null, 2));
                                    if (r.message && r.message.data) {
                                        frappe.msgprint(__('Content fetched successfully.'));
                                        frm.set_value('selling', r.message.data.selling);
                                        frm.set_value('apply_on', r.message.data.apply_on);
                                        frm.set_value('applicable_for', r.message.data.applicable_for);
                        
                                        if (r.message.data.applicable_for === 'Customer') {
                                            frm.clear_table('customer');
                                        } else if (r.message.data.applicable_for === 'Customer Group') {
                                            frm.clear_table('customer_group');
                                        }
                        
                                        if (r.message.data.customer && r.message.data.applicable_for === 'Customer') {
                                            r.message.data.customer.forEach(customer => {
                                                let row = frm.add_child('customer');
                                                row.customer = customer.customer;
                                                row.customer_name = customer.customer_name;
                                            });
                                        }
                                        if (r.message.data.customer_group && r.message.data.applicable_for === 'Customer Group') {
                                            r.message.data.customer_group.forEach(customer_group => {
                                                let row = frm.add_child('customer_group');
                                                row.customer_group = customer_group.customer_group;
                                                row.customer_group_name = customer_group.customer_group_name;
                                            });
                                        }
                        
                                        let new_selected_rows = [];
                                        r.message.data.custom_personalized_content_detail.forEach(item => {
                                            let pc = all_personalized_contents.find(pc => pc.name === item.id);
                                            let row = frm.add_child('custom_personalized_content_detail');
                                            row.id = item.id;
                                            row.target = item.customer || 'Unknown Target';
                                            row.content = item.content || 'N/A';
                                            row.offering_item_images = item.offering_item_images || '';
                                            console.log('Adding row to Child Table:', { id: item.id, target: row.target, content: row.content, offering_item_images: row.offering_item_images });
                        
                                            new_selected_rows.push({
                                                id: item.id,
                                                target: item.customer || 'Unknown Target',
                                                content: item.content || 'N/A',
                                                offering_item_images: item.offering_item_images || ''
                                            });
                                        });
                        
                                        selected_rows = new_selected_rows;
                        
                                        frm.refresh_field('custom_personalized_content_detail');
                        
                                        // Gọi updateContentAutomatically ngay sau khi thêm dữ liệu
                                        updateContentAutomatically(frm);
                                        renderContentColumn();
                        
                                        // Gán lại các sự kiện để cập nhật dòng xanh, đỏ
                                        frappe.ui.form.on('Promotional Scheme Price Discount', {
                                            min_qty: function(frm) { updateContentAutomatically(frm); },
                                            max_qty: function(frm) { updateContentAutomatically(frm); },
                                            min_amount: function(frm) { updateContentAutomatically(frm); },
                                            max_amount: function(frm) { updateContentAutomatically(frm); },
                                            discount_percentage: function(frm) { updateContentAutomatically(frm); }
                                        });
                        
                                        frappe.ui.form.on('Promotional Scheme Product Discount', {
                                            min_qty: function(frm) { updateContentAutomatically(frm); },
                                            max_qty: function(frm) { updateContentAutomatically(frm); },
                                            min_amount: function(frm) { updateContentAutomatically(frm); },
                                            max_amount: function(frm) { updateContentAutomatically(frm); },
                                            free_qty: function(frm) { updateContentAutomatically(frm); },
                                            free_item: function(frm) { updateContentAutomatically(frm); }
                                        });
                        
                                        frm.refresh();
                                        frm.dirty();
                                    } else {
                                        frappe.msgprint(__('Error: No data returned from server.'));
                                    }
                                    if (r.message && r.message.message) {
                                        frappe.msgprint(r.message.message);
                                    }
                                    if (document.activeElement) {
                                        document.activeElement.blur();
                                    }
                                    d.hide();
                                },
                                error: function(err) {
                                    frappe.msgprint(__('Error: Failed to process the selected Personalized Content. Check server logs.'));
                                    console.error('Error:', err);
                                    if (document.activeElement) {
                                        document.activeElement.blur();
                                    }
                                    d.hide();
                                }
                            });
                        });
                
                        frappe.call({
                            method: 'personalized_content.personalized_content.overrides.promotional_scheme.get_personalized_content_data_for_content_whitelisted',
                            args: {},
                            callback: function(r) {
                                console.log('Server response (all_personalized_contents):', JSON.stringify(r.message, null, 2));
                                if (r.message && r.message.length > 0) {
                                    all_personalized_contents = r.message;
                                    renderContentTable(
                                        selected_source,
                                        d.get_value('customer_name_filter') || last_manual_input,
                                        d.get_value('customer_group_filter') || '',
                                        d.get_value('price_from'),
                                        d.get_value('price_to')
                                    );
                                } else {
                                    frappe.msgprint(__('No Personalized Content found with status Draft.'));
                                    d.fields_dict.personalized_content_list.$wrapper.html('<p>No records found.</p>');
                                }
                            },
                            error: function(err) {
                                frappe.msgprint(__('Error: Failed to fetch Personalized Content data. Check server logs.'));
                                console.error('Error:', err);
                            }
                        });
                
                        d.show();
                    } else {
                        frappe.msgprint(__('Error: Failed to load dialog configuration.'));
                    }
                },
                error: function (err) {
                    frappe.msgprint(__('Error: Failed to load dialog configuration. Check server logs.'));
                    console.error('Error:', err);
                }
            });
        }

        // Hàm cập nhật nội dung tự động
        function updateContentAutomatically(frm, deletedTable = null) {
            if (frm.doc.custom_personalized_content_detail && frm.doc.custom_personalized_content_detail.length > 0) {
                frm.doc.custom_personalized_content_detail.forEach(row => {
                    // Lấy nội dung hiện tại của row.content
                    let currentContent = row.content || '';
                    
                    // Tách nội dung gốc (textPart và imagePart) từ currentContent
                    let textPart = currentContent;
                    let imagePart = '';
                    let imgIndex = currentContent.toLowerCase().indexOf('<img');
                    if (imgIndex !== -1) {
                        textPart = currentContent.substring(0, imgIndex);
                        imagePart = currentContent.substring(imgIndex);
                    }
        
                    // Loại bỏ phần discount-content hiện tại (nếu có) để chuẩn bị cập nhật
                    let discountContentStart = textPart.indexOf('<div class="discount-content"');
                    if (discountContentStart !== -1) {
                        textPart = textPart.substring(0, discountContentStart);
                    }
        
                    let validFrom = frm.doc.valid_from ? frappe.datetime.str_to_user(frm.doc.valid_from) : 'N/A';
                    let validUpto = frm.doc.valid_upto ? frappe.datetime.str_to_user(frm.doc.valid_upto) : 'N/A';
        
                    // Tạo nội dung mới cho price_discount_slabs
                    let priceDiscountContent = '';
                    if (frm.doc.price_discount_slabs && frm.doc.price_discount_slabs.length > 0 && deletedTable !== 'price_discount_slabs') {
                        priceDiscountContent = '<div class="discount-content" style="background-color: #e6f3e6; padding: 3px; margin-top: 5px; font-size: 0.9em; border: 1px solid #c1e1c1; margin-bottom: 10px;">';
                        frm.doc.price_discount_slabs.forEach(slab => {
                            let min_qty = parseFloat(slab.min_qty) || 0;
                            let max_qty = parseFloat(slab.max_qty) || 0;
                            let min_amount = parseFloat(slab.min_amount) || 0;
                            let max_amount = parseFloat(slab.max_amount) || 0;
                            let discount_percentage = parseFloat(slab.discount_percentage) || 0;
        
                            if (discount_percentage === 0 || (max_qty === 0 && max_amount === 0)) {
                                return;
                            }
        
                            let qtyCondition = max_qty > 0 ? ` với số lượng sản phẩm từ ${min_qty} tới ${max_qty}` : '';
                            let amountCondition = max_amount > 0 ? ` ${max_qty > 0 ? 'và' : 'có'} giá trị đơn hàng từ ${min_amount} tới ${max_amount}` : '';
                            let discountMessage = ` sẽ được giảm ${discount_percentage}% trên toàn bộ giá trị đơn hàng.`;
        
                            priceDiscountContent += `
                                Đơn hàng mua từ ${validFrom}${frm.doc.valid_upto ? ` tới ${validUpto}` : ''}${qtyCondition}${amountCondition}${discountMessage}<br>
                            `;
                        });
                        priceDiscountContent += '</div>';
                        if (priceDiscountContent === '<div class="discount-content" style="background-color: #e6f3e6; padding: 3px; margin-top: 5px; font-size: 0.9em; border: 1px solid #c1e1c1; margin-bottom: 10px;"></div>') {
                            priceDiscountContent = '';
                        }
                        console.log('Price Discount Content:', priceDiscountContent);
                    }
        
                    // Tạo nội dung mới cho product_discount_slabs
                    let productDiscountContent = '';
                    if (frm.doc.product_discount_slabs && frm.doc.product_discount_slabs.length > 0 && deletedTable !== 'product_discount_slabs') {
                        productDiscountContent = '<div class="discount-content" style="background-color: #f9e6e6; padding: 3px; margin-top: 5px; font-size: 0.9em; border: 1px solid #e1c1c1; margin-bottom: 10px;">';
                        frm.doc.product_discount_slabs.forEach(slab => {
                            let min_qty = parseFloat(slab.min_qty) || 0;
                            let max_qty = parseFloat(slab.max_qty) || 0;
                            let min_amount = parseFloat(slab.min_amount) || 0;
                            let max_amount = parseFloat(slab.max_amount) || 0;
                            let free_qty = parseFloat(slab.free_qty) || 0;
                            let free_item = slab.free_item || '';
        
                            if (max_qty === 0 && max_amount === 0 && free_qty === 0) {
                                return;
                            }
        
                            let qtyCondition = max_qty > 0 ? ` với số lượng sản phẩm từ ${min_qty} tới ${max_qty}` : '';
                            let amountCondition = max_amount > 0 ? ` ${max_qty > 0 ? 'và' : 'có'} giá trị đơn hàng từ ${min_amount} tới ${max_amount}` : '';
                            let giftMessage = free_item ? ` sẽ được tặng ${free_qty > 0 ? `${free_qty} ` : ''}${free_item}` : '';
        
                            if (!giftMessage) {
                                return;
                            }
        
                            productDiscountContent += `
                                Đơn hàng mua từ ${validFrom}${frm.doc.valid_upto ? ` tới ${validUpto}` : ''}${qtyCondition}${amountCondition}${giftMessage}.<br>
                            `;
                        });
                        productDiscountContent += '</div>';
                        if (productDiscountContent === '<div class="discount-content" style="background-color: #f9e6e6; padding: 3px; margin-top: 5px; font-size: 0.9em; border: 1px solid #e1c1c1; margin-bottom: 10px;"></div>') {
                            productDiscountContent = '';
                        }
                        console.log('Product Discount Content:', productDiscountContent);
                    }
        
                    // Gộp lại nội dung: textPart + các thông báo (nếu có) + ảnh từ Offering Item
                    row.content = textPart + (priceDiscountContent || '') + (productDiscountContent || '');
        
                    // Đảm bảo offering_item_images không bị ghi đè
                    if (!row.offering_item_images) {
                        let originalRow = selected_rows.find(sr => sr.id === row.id);
                        row.offering_item_images = originalRow ? originalRow.offering_item_images || '' : '';
                    }
                });
        
                // Cập nhật giao diện Child Table
                frm.refresh_field('custom_personalized_content_detail');
                renderContentColumn();
            }
        }
    }
});