require('dotenv').config({ path: '.env.local' });
const { init } = require('@instantdb/admin');

const APP_ID = process.env.NEXT_PUBLIC_INSTANT_APP_ID;
const ADMIN_TOKEN = process.env.INSTANT_ADMIN_TOKEN;

if (!APP_ID || !ADMIN_TOKEN) {
  console.error('Missing environment variables');
  process.exit(1);
}

const db = init({
  appId: APP_ID,
  adminToken: ADMIN_TOKEN,
});

function generateId() {
  return require('crypto').randomUUID();
}

const sampleOrganizations = [
  {
    name: "Regional Food Bank of Oklahoma",
    description: "Feeding hope across 53 counties in Oklahoma through mobile food pantries, partner agencies, and direct distribution programs.",
    category: "Food Security",
    website: "https://www.rfbo.org",
    phone: "(405) 972-1111",
    email: "info@rfbo.org",
    statistics: "Distributes 45 million pounds of food annually, serving 100,000+ people each month",
    locations: [
      {
        address: "3355 S Country Club Rd, Oklahoma City, OK 73129",
        latitude: 35.4184,
        longitude: -97.6103,
        isPrimary: true
      }
    ]
  },
  {
    name: "Homeless Alliance",
    description: "Creating opportunities for individuals and families experiencing homelessness to improve their lives through advocacy, services, and housing.",
    category: "Housing & Shelter",
    website: "https://www.homelessalliance.org",
    phone: "(405) 415-8410",
    email: "info@homelessalliance.org",
    statistics: "Provides emergency shelter for 200+ individuals nightly, placed 400+ people in permanent housing in 2023",
    locations: [
      {
        address: "1724 NW 4th St, Oklahoma City, OK 73106",
        latitude: 35.4851,
        longitude: -97.5464,
        isPrimary: true
      }
    ]
  },
  {
    name: "Boys & Girls Clubs of Oklahoma County",
    description: "Enabling all young people to reach their full potential as productive, caring, responsible citizens through after-school and summer programs.",
    category: "Youth Development",
    website: "https://www.bgcokc.org",
    phone: "(405) 232-6435",
    email: "info@bgcokc.org",
    statistics: "Serves 2,500+ youth annually across 8 club locations with academic support, leadership development, and character building",
    locations: [
      {
        address: "1100 NE 7th St, Oklahoma City, OK 73104",
        latitude: 35.4729,
        longitude: -97.5082,
        isPrimary: true
      },
      {
        address: "2508 Classen Blvd, Oklahoma City, OK 73106",
        latitude: 35.4951,
        longitude: -97.5334,
        isPrimary: false
      }
    ]
  },
  {
    name: "Oklahoma City Beautiful",
    description: "Building community pride through environmental stewardship, beautification projects, and sustainability education programs.",
    category: "Environmental",
    website: "https://www.okcbeautiful.com",
    phone: "(405) 297-3162",
    email: "info@okcbeautiful.com",
    statistics: "Planted 5,000+ trees, organized 150+ cleanup events, diverted 50 tons of waste from landfills in 2023",
    locations: [
      {
        address: "420 W Main St, Oklahoma City, OK 73102",
        latitude: 35.4676,
        longitude: -97.5164,
        isPrimary: true
      }
    ]
  }
];

async function seedDatabase() {
  console.log('Starting to seed database...');
  
  try {
    for (const orgData of sampleOrganizations) {
      const orgId = generateId();
      console.log(`Creating organization: ${orgData.name}`);
      
      // Create the organization
      await db.transact([
        db.tx.organizations[orgId].update({
          name: orgData.name,
          description: orgData.description,
          category: orgData.category,
          website: orgData.website,
          phone: orgData.phone,
          email: orgData.email,
          statistics: orgData.statistics,
          createdAt: Date.now()
        })
      ]);
      
      // Create locations for this organization
      for (const locationData of orgData.locations) {
        const locationId = generateId();
        console.log(`  Creating location: ${locationData.address}`);
        
        await db.transact([
          db.tx.locations[locationId].update({
            address: locationData.address,
            latitude: locationData.latitude,
            longitude: locationData.longitude,
            isPrimary: locationData.isPrimary
          }).link({ organization: orgId })
        ]);
      }
      
      console.log(`✓ Created ${orgData.name} with ${orgData.locations.length} location(s)`);
    }
    
    console.log('✅ Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();