# Copyright (c) 2025, 1 and contributors
# For license information, please see license.txt

# import frappe
from frappe.model.document import Document


class CustomerGroupPersonalizedContent(Document):
	# begin: auto-generated types
	# This code is auto-generated. Do not modify anything in this block.

	from typing import TYPE_CHECKING

	if TYPE_CHECKING:
		from frappe.types import DF

		amount: DF.Currency
		content: DF.Text | None
		date_time: DF.Datetime | None
		parent: DF.Data
		parentfield: DF.Data
		parenttype: DF.Data
		personalized_content: DF.Link
		status: DF.Literal["Draft", "Submitted", "Approved"]
		target: DF.Data
	# end: auto-generated types
	pass
