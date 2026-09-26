const legacyContactValues = [
  'support@localfix.com',
  'privacy@localfix.com',
  'legal@localfix.com',
  'grievance@localfix.com',
];

export const withDynamicContact = (sections, settings) => {
  const contact = settings?.contact || {};
  const email = contact.supportEmail || contact.officialEmail || 'our Contact page';
  const address = [contact.officeAddress, contact.city, contact.state, contact.country, contact.postalCode]
    .filter(Boolean)
    .join(', ');
  const addressText = address ? `${settings?.siteName || 'LocalFix'}, ${address}` : 'the contact details listed on our Contact page';
  const hoursText = contact.businessHours ? `Our team is available ${contact.businessHours}.` : 'Please see our Contact page for current business hours.';

  return sections.map((section) => ({
    ...section,
    content: section.content.map((paragraph) => {
      let updated = paragraph;
      for (const legacyValue of legacyContactValues) updated = updated.replaceAll(legacyValue, email);
      updated = updated.replaceAll('LocalFix Technologies, 123 MG Road, Bengaluru, Karnataka 560001, India', addressText);
      updated = updated.replaceAll('Our support team is available Monday to Saturday, 9 AM to 8 PM IST.', hoursText);
      updated = updated.replaceAll('Our team is available Monday to Saturday, 9 AM to 8 PM IST.', hoursText);
      return updated;
    }),
  }));
};