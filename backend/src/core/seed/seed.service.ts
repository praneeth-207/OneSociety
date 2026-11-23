import bcrypt from 'bcryptjs';
import { Society } from '../models/society.model.js';
import { Flat } from '../models/flat.model.js';
import { User } from '../models/user.model.js';
import { Roles } from '../rbac/roles.js';
import { ComplaintCategory } from '../../modules/complaints/models/complaint_category.model.js';
import { Complaint } from '../../modules/complaints/models/complaint.model.js';
import { VisitPass } from '../../modules/society_help/models/visit_pass.model.js';
import { VisitRequest } from '../../modules/society_help/models/visit_request.model.js';
import { MaintBill } from '../../modules/society_help/models/maint_bill.model.js';
import { SHProviderProfile } from '../../modules/service_hub/models/sh_provider_profile.model.js';
import { SHSlot } from '../../modules/service_hub/models/sh_slot.model.js';
import { SRItem } from '../../modules/share_rent/models/sr_item.model.js';
import { GBDeal } from '../../modules/group_buying/models/gb_deal.model.js';

export async function seedDatabase(): Promise<void> {
  const existingSociety = await Society.findOne({ code: 'SHANTINIKETAN' });
  if (existingSociety) {
    return; // Already seeded
  }

  console.log('Seeding OneSociety baseline data...');

  const society = new Society({
    name: 'Shantiniketan Apartment Society',
    code: 'SHANTINIKETAN',
    address: 'Survey No. 42, Hitech City Main Road, Madhapur',
    city: 'Hyderabad',
    blocks: ['Block A', 'Block B', 'Block C', 'Block D'],
    commonAreas: [
      'Lift Lobby',
      'Staircase Area',
      'Basement Parking',
      'Ground Floor Entrance',
      'Terrace / Roof',
      'Clubhouse',
      'Swimming Pool Area',
      'Garden / Children Park',
      'Security Gate',
      'Pump Room / Water Tank',
      'Electrical Meter Room',
    ],
    settings: {
      minorExpenseThreshold: 5000,
      escalationHoursHigh: 4,
      escalationHoursMedium: 24,
      escalationHoursLow: 72,
      maxReopenLimit: 2,
      qrValidityHoursDefault: 2,
      groupBuyingIssueWindowHours: 24,
    },
  });
  await society.save();

  // Create 20 Flats (5 per block across 4 blocks)
  const defaultPasswordHash = await bcrypt.hash('password123', 10);
  const flats = [];

  for (const block of ['Block A', 'Block B', 'Block C', 'Block D']) {
    for (let floor = 1; floor <= 5; floor++) {
      const flatNumber = `${block.replace('Block ', '')}-${floor}01`;
      const flat = new Flat({
        societyId: society._id,
        block,
        flatNumber,
        floor,
      });
      await flat.save();
      flats.push(flat);
    }
  }

  // 1. President: Suresh Sharma
  const president = new User({
    name: 'Suresh Sharma',
    email: 'president@onesociety.in',
    phone: '9876543210',
    passwordHash: defaultPasswordHash,
    role: Roles.PRESIDENT,
    societyId: society._id,
    flatId: flats[0]._id,
    flatNumber: flats[0].flatNumber,
    mustChangePassword: false,
    status: 'ACTIVE',
  });
  await president.save();
  flats[0].residentId = president._id as any;
  await flats[0].save();

  // 2. Residents: Rahul, Amrutha, Priya, Vikram
  const rahul = new User({
    name: 'Rahul Varma',
    email: 'rahul@onesociety.in',
    phone: '9876543211',
    passwordHash: defaultPasswordHash,
    role: Roles.RESIDENT,
    societyId: society._id,
    flatId: flats[1]._id,
    flatNumber: flats[1].flatNumber,
    mustChangePassword: false,
    status: 'ACTIVE',
  });
  await rahul.save();
  flats[1].residentId = rahul._id as any;
  await flats[1].save();

  const amrutha = new User({
    name: 'Amrutha Rao',
    email: 'amrutha@onesociety.in',
    phone: '9876543212',
    passwordHash: defaultPasswordHash,
    role: Roles.RESIDENT,
    societyId: society._id,
    flatId: flats[2]._id,
    flatNumber: flats[2].flatNumber,
    mustChangePassword: false,
    status: 'ACTIVE',
  });
  await amrutha.save();
  flats[2].residentId = amrutha._id as any;
  await flats[2].save();

  const priya = new User({
    name: 'Priya Sundaram',
    email: 'priya@onesociety.in',
    phone: '9876543213',
    passwordHash: defaultPasswordHash,
    role: Roles.RESIDENT,
    societyId: society._id,
    flatId: flats[3]._id,
    flatNumber: flats[3].flatNumber,
    mustChangePassword: false,
    status: 'ACTIVE',
  });
  await priya.save();
  flats[3].residentId = priya._id as any;
  await flats[3].save();

  const vikram = new User({
    name: 'Vikram Reddy',
    email: 'vikram@onesociety.in',
    phone: '9876543214',
    passwordHash: defaultPasswordHash,
    role: Roles.RESIDENT,
    societyId: society._id,
    flatId: flats[4]._id,
    flatNumber: flats[4].flatNumber,
    mustChangePassword: false,
    status: 'ACTIVE',
  });
  await vikram.save();
  flats[4].residentId = vikram._id as any;
  await flats[4].save();

  // 3. Security Personnel: Bahadur Singh
  const guard = new User({
    name: 'Bahadur Singh',
    email: 'guard@onesociety.in',
    phone: '9876543220',
    passwordHash: defaultPasswordHash,
    role: Roles.SECURITY_PERSONNEL,
    societyId: society._id,
    mustChangePassword: false,
    status: 'ACTIVE',
  });
  await guard.save();

  // 4. External Service Provider (Created by President with temporary password & mustChangePassword=true)
  const electrician = new User({
    name: 'Ramesh Electrician',
    email: 'ramesh.electrician@onesociety.in',
    phone: '9876543230',
    passwordHash: defaultPasswordHash,
    role: Roles.SERVICE_PROVIDER,
    societyId: society._id,
    mustChangePassword: true, // Forces password change on first login!
    temporaryPasswordPlain: 'password123',
    status: 'ACTIVE',
  });
  await electrician.save();

  // 5. Suppliers: Fresh Farms (GST verified), Heritage Foods (President verified), Quick Kirana (Pending)
  const supplier1 = new User({
    name: 'Fresh Farms Dairy & Agro',
    email: 'freshfarms@supplier.in',
    phone: '9876543240',
    passwordHash: defaultPasswordHash,
    role: Roles.SUPPLIER,
    societyId: society._id,
    mustChangePassword: false,
    status: 'ACTIVE',
  });
  await supplier1.save();

  // 6. Seed Module 4: Categories
  const elecCat = new ComplaintCategory({
    societyId: society._id,
    name: 'Electrical',
    defaultProviderType: 'EXTERNAL',
    isEmergency: false,
    subcategories: ['Corridor Lights', 'Lift Power', 'Common Meter Panel', 'Sparks'],
  });
  await elecCat.save();

  // 7. Seed Past Month Maintenance Bills (2026-10)
  for (const f of flats) {
    const resident = f.residentId ? await User.findById(f.residentId) : null;
    const mb = new MaintBill({
      societyId: society._id,
      flatId: f._id,
      flatNumber: f.flatNumber,
      residentId: resident?._id,
      residentName: resident?.name || 'Unassigned',
      billingMonth: '2026-10',
      amount: 2500,
      dueDate: new Date('2026-10-31'),
      status: 'PAID',
      paymentMethod: 'SIMULATED_ONLINE',
      paidAt: new Date('2026-10-25'),
    });
    await mb.save();
  }

  // 8. Seed Module 3: Service Hub Profiles & Slots
  let maidUser = await User.findOne({ phone: '9876543250' });
  if (!maidUser) {
    maidUser = new User({
      name: 'Sunita Bai',
      email: 'sunita.maid@onesociety.in',
      phone: '9876543250',
      passwordHash: defaultPasswordHash,
      role: Roles.SERVICE_PROVIDER,
      societyId: society._id,
      status: 'ACTIVE',
    });
    await maidUser.save();

    const maidProfile = new SHProviderProfile({
      societyId: society._id,
      userId: maidUser._id,
      providerName: 'Sunita Bai',
      phone: '9876543250',
      providerType: 'EXTERNAL',
      skills: ['HOUSEMAID', 'CLEANING'],
      bio: 'Experienced housekeeping, utensil cleaning, and floor mopping assistant with 6 years experience in Hitech City.',
      ratePerSlot: 400,
      verificationStatus: 'APPROVED',
      ratingAverage: 4.9,
      totalReviews: 14,
    });
    await maidProfile.save();
  }

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const existingSlot = await SHSlot.findOne({ societyId: society._id, date: todayStr });
  if (!existingSlot) {
    for (const timeSlot of ['07:00 - 08:00', '08:00 - 09:00', '09:00 - 10:00', '16:00 - 17:00']) {
      const slot = new SHSlot({
        societyId: society._id,
        providerId: maidUser._id,
        providerName: maidUser.name,
        serviceCategory: 'HOUSEMAID',
        date: todayStr,
        timeSlot,
        isBooked: false,
      });
      await slot.save();
    }
  }

  // 9. Seed Module 2: Share & Rent Items
  const existingItem = await SRItem.findOne({ title: 'Bosch Professional Cordless Hammer Drill Kit' });
  if (!existingItem) {
    const item1 = new SRItem({
      societyId: society._id,
      ownerId: rahul._id,
      ownerName: rahul.name,
      ownerFlatNumber: rahul.flatNumber,
      title: 'Bosch Professional Cordless Hammer Drill Kit',
      category: 'TOOLS',
      description: 'Heavy duty 18V cordless drill with 2 batteries, charger, and full bit set.',
      dailyRate: 150,
      securityDeposit: 1500,
      isAvailable: true,
    });
    await item1.save();

    const item2 = new SRItem({
      societyId: society._id,
      ownerId: amrutha._id,
      ownerName: amrutha.name,
      ownerFlatNumber: amrutha.flatNumber,
      title: 'Quechua 4-Person Waterproof Camping Tent',
      category: 'CAMPING',
      description: 'Easy pop-up tent, completely waterproof with ground sheet and pegs included.',
      dailyRate: 200,
      securityDeposit: 2000,
      isAvailable: true,
    });
    await item2.save();
  }

  // 10. Seed Module 1: Group Buying Bulk Deal
  const existingDeal = await GBDeal.findOne({ dealId: '#GB-1001' });
  if (!existingDeal) {
    const deal1 = new GBDeal({
      dealId: '#GB-1001',
      societyId: society._id,
      supplierId: supplier1._id,
      supplierName: supplier1.name,
      title: 'Premium Ratnagiri Alphonso Mangoes',
      category: 'Fruits & Produce',
      description: 'Naturally ripened carbide-free export grade Alphonso mangoes direct from Devgad farms.',
      unit: 'Box (12 pcs)',
      tiers: [
        { minQty: 1, maxQty: 19, pricePerUnit: 800 },
        { minQty: 20, maxQty: 49, pricePerUnit: 700 },
        { minQty: 50, pricePerUnit: 600 },
      ],
      minTargetQty: 20,
      currentTotalQty: 12,
      currentPrice: 800,
      status: 'OPEN',
      deadline: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
      deliveryDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
    });
    await deal1.save();
  }

  console.log('OneSociety baseline seed completed successfully.');
}
