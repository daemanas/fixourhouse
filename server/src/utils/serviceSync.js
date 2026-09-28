import Provider from '../models/Provider.js';
import Service from '../models/Service.js';
import Category from '../models/Category.js';
import ServiceType from '../models/ServiceType.js';

/**
 * Ensures all provider services stored in Provider.services subdocuments
 * also exist as standalone documents in the Service collection, and ensures
 * category / serviceType refs are attached.
 */
export async function syncProviderServices() {
  try {
    const providers = await Provider.find({}).lean();
    if (!providers || providers.length === 0) return;

    // Get default category/type fallback if needed
    let defaultCategory = await Category.findOne({ isActive: true });
    let defaultType = await ServiceType.findOne({ isActive: true });

    for (const provider of providers) {
      if (!provider.services || provider.services.length === 0) continue;

      for (const svc of provider.services) {
        if (!svc || !svc.name) continue;

        let serviceDoc = await Service.findById(svc._id);
        if (!serviceDoc) {
          // Check if category exists by provider category or name
          let catId = svc.serviceCategoryId;
          if (!catId && provider.category) {
            const matchedCat = await Category.findOne({
              $or: [
                { name: new RegExp(`^${provider.category.trim()}$`, 'i') },
                { slug: provider.category.trim().toLowerCase() },
              ],
            });
            if (matchedCat) {
              catId = matchedCat._id;
              if (matchedCat.serviceTypeId) {
                svc.serviceTypeId = matchedCat.serviceTypeId;
              }
            }
          }

          if (!catId && defaultCategory) {
            catId = defaultCategory._id;
          }

          let typeId = svc.serviceTypeId;
          if (!typeId && defaultType) {
            typeId = defaultType._id;
          }

          await Service.create({
            _id: svc._id,
            providerId: provider._id,
            serviceTypeId: typeId || null,
            serviceCategoryId: catId || null,
            categoryId: catId || null,
            name: svc.name,
            description: svc.description || '',
            price: svc.price || 0,
            duration: svc.duration || '',
            image: svc.image || '',
            images: svc.image ? [svc.image] : [],
            isActive: typeof svc.isActive === 'boolean' ? svc.isActive : true,
            popular: svc.popular || false,
          });
        }
      }
    }
  } catch (err) {
    console.error('Error syncing provider services:', err.message);
  }
}
