# -*- coding: utf-8 -*-
# Copyright (c) 2020, Alpha Herald Management and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from frappe.model.document import Document


class PRULIATelcoDevices(Document):
    pass


@frappe.whitelist(allow_guest=True)
def get_all():
    return frappe.get_all('PRULIA Telco Devices', fields=['*'])
