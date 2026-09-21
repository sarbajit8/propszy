const { prisma } = require('../backend/src/config/prisma');

async function check() {
  const props = await prisma.property.findMany({
    where: { videoUrl: { not: null } },
    select: { id: true, name: true, unitType: true, videoUrl: true }
  });
  console.log('Properties with videoUrl:');
  console.log(JSON.stringify(props, null, 2));

  const projects = await prisma.project.findMany({
    where: { featuredVideoUrl: { not: null } },
    select: { id: true, name: true, featuredVideoUrl: true }
  });
  console.log('Projects with featuredVideoUrl:');
  console.log(JSON.stringify(projects, null, 2));
}

check().catch(console.error).finally(() => prisma.$disconnect());
