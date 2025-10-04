import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
const prisma = new PrismaClient();

async function main(){
  const email = process.env.ADMIN_EMAIL || "admin@example.com";
  const pass  = process.env.ADMIN_PASSWORD || "123456";
  const found = await prisma.user.findUnique({ where: { email } });
  if (!found){
    await prisma.user.create({
      data: { email, password: bcrypt.hashSync(pass,10), role: "ADMIN", name: "Admin" }
    });
    console.log("Admin seed:", email);
  } else {
    console.log("Admin exists:", email);
  }
}
main().catch(e=>{console.error(e);process.exit(1)}).finally(()=>prisma.$disconnect());
