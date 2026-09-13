import prisma from "../backend/lib/db.js";

async function seedDemoProjects() {
  const teacher1 = await prisma.user.findFirst({ where: { email: "sangeetm@srmist.edu.in" } });
  const teacher2 = await prisma.user.findFirst({ where: { email: "vadivukk@srmist.edu.in" } });

  if (!teacher1) {
    console.error("Teacher 1 not found");
    return;
  }

  const existing = await prisma.project.count();
  if (existing > 0) {
    console.log(`Already have ${existing} projects.`);
    return;
  }

  const p1 = await prisma.project.create({
    data: {
      teacherId: teacher1.id,
      facultyName: teacher1.fullName,
      projectTitle: "Edge AI Autonomous Drone Surveillance System with Real-Time Object Tracking",
      description: "Design and deployment of a lightweight YOLOv8 neural network on NVIDIA Jetson Orin Nano for autonomous drone trajectory planning, aerial perimeter security, and real-time obstacle avoidance in GPS-denied environments.",
      stream: "B.Tech ECE, B.Tech ECE with specialization in Data Science, B.Tech ECE (Core)",
      domain: "AI/ML/DL based applications",
    }
  });

  const p2 = await prisma.project.create({
    data: {
      teacherId: teacher1.id,
      facultyName: teacher1.fullName,
      projectTitle: "Low-Power LoRaWAN Environmental Monitoring & Smart Campus Grid Node",
      description: "Development of an ultra-low-power energy harvesting sensor node utilizing STM32 microcontrollers and LoRaWAN transceivers for campus-wide microclimate logging, battery lifecycle optimization, and telemetry aggregation.",
      stream: "B.Tech ECE, B.Tech ECE with specialization in Cyber Physical Systems",
      domain: "Embedded Systems and IoT",
    }
  });

  const p3 = await prisma.project.create({
    data: {
      teacherId: teacher2 ? teacher2.id : teacher1.id,
      facultyName: teacher2 ? teacher2.fullName : teacher1.fullName,
      projectTitle: "Design of Reconfigurable Intelligent Surface (RIS) for 6G Wireless Coverage",
      description: "Electromagnetic modeling, beam steering simulation using CST Studio Suite, and FPGA prototype validation for sub-6GHz and mmWave reconfigurable intelligent surfaces to mitigate multipath fading in smart environments.",
      stream: "B.Tech ECE, B.Tech ECE (Core)",
      domain: "Antenna design and RF systems",
    }
  });

  const p4 = await prisma.project.create({
    data: {
      teacherId: teacher2 ? teacher2.id : teacher1.id,
      facultyName: teacher2 ? teacher2.fullName : teacher1.fullName,
      projectTitle: "Deep Learning Wearable for Cardiac Arrhythmia Detection using TinyML",
      description: "Implementation of a wearable ESP32-S3 sensor patch running quantized Convolutional Neural Networks on edge microcontroller for continuous ECG rhythm classification with sub-10mW power consumption.",
      stream: "B.Tech ECE, B.Tech ECE with specialization in Data Science",
      domain: "Biomedical Signal and Device Engineering",
    }
  });

  console.log("Successfully seeded 4 realistic capstone projects!");
}

seedDemoProjects().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
