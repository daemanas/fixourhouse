import CommissionOffer from '../models/CommissionOffer.js';
import CommissionSettings from '../models/CommissionSettings.js';

export const getDefaultCommissionRate = async () => {
  const settings = await CommissionSettings.findOneAndUpdate(
    { key: 'commission' },
    { $setOnInsert: { key: 'commission' } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return settings.defaultRate;
};

export const resolveProviderCommission = async (provider, now = new Date()) => {
  const offers = await CommissionOffer.find({
    isActive: true,
    startDate: { $lte: now },
    endDate: { $gte: now },
  }).sort({ startDate: -1, createdAt: -1, _id: 1 });
  const registeredAt = new Date(provider.createdAt);
  const eligible = offers.filter((offer) => {
    if (offer.appliesTo === 'newProviders') {
      const durationEnd = new Date(registeredAt.getTime() + offer.durationDays * 86400000);
      return registeredAt >= offer.startDate && registeredAt <= offer.endDate && now < durationEnd;
    }
    const durationEnd = new Date(offer.startDate.getTime() + offer.durationDays * 86400000);
    return now < durationEnd;
  });

  eligible.sort((left, right) => {
    if (left.appliesTo !== right.appliesTo) return left.appliesTo === 'newProviders' ? -1 : 1;
    return right.startDate - left.startDate || right.createdAt - left.createdAt || String(left._id).localeCompare(String(right._id));
  });

  const offer = eligible[0];
  if (offer) {
    return {
      rate: offer.commissionRate,
      source: 'offer',
      offerId: offer._id,
      offerName: offer.name,
    };
  }
  return { rate: await getDefaultCommissionRate(), source: 'default', offerId: null, offerName: '' };
};