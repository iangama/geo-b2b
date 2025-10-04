import express from "express";
import cors from "cors";
import morgan from "morgan";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import Redis from "ioredis";
import slugify from "slugify";
import { z } from "zod";
import fetch from "node-fetch";

const app = express();
const prisma = new PrismaClient({ log: ["error","warn","query"] });
const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");
const JWT_SECRET = process.env.JWT_SECRET || "devsecret";

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));
app.use((req,res,next)=>{ const t=Date.now(); res.on("finish",()=>console.log(req.method, req.url, res.statusCode, (Date.now()-t)+"ms")); next(); });
app.use((req,res,next)=>{
  const p=req.url;
  if((p.startsWith("/auth/")||p.startsWith("/tenants")||p.startsWith("/t/")||p.startsWith("/geo/"))&&!p.startsWith("/api/")){
    req.url = "/api"+p;
  }
  next();
});
app.get("/api/health", (_req,res)=>res.json({ok:true}));
app.get("/health", (_req,res)=>res.json({ok:true}));
app.get("/api/health", (_req,res)=>res.json({ok:true}));

app.get("/health", (_req,res)=>res.json({ok:true}));

const sign = (u) => jwt.sign({ id:u.id, email:u.email, role:u.role }, JWT_SECRET, { expiresIn:"7d" });

const auth = (req,res,next)=>{
  const h = req.headers.authorization || "";
  const t = h.startsWith("Bearer ")?h.slice(7):null;
  if(!t) return res.status(401).json({error:"unauthorized"});
  try{ req.user = jwt.verify(t, JWT_SECRET); next(); }catch{ return res.status(401).json({error:"invalid_token"}); }
};

const sellerGuard = async (req,res,next)=>{
  const slug = req.params.slug || req.body.slug;
  if(!slug) return res.status(400).json({error:"tenant slug required"});
  const tenant = await prisma.tenant.findUnique({ where:{ slug } });
  if(!tenant) return res.status(404).json({error:"tenant_not_found"});
  const m = await prisma.membership.findFirst({ where:{ userId:req.user.id, tenantId:tenant.id }});
  if(!m || (m.role!=="OWNER" && m.role!=="SELLER")) return res.status(403).json({error:"not_seller"});
  req.tenant = tenant;
  next();
};

app.get("/api/health", (_req,res)=>res.json({ok:true}));

// Auth
app.post("/api/auth/register", async (req,res)=>{
  const schema = z.object({ email:z.string().email(), password:z.string().min(6), name:z.string().optional()});
  const data = schema.parse(req.body);
  const exists = await prisma.user.findUnique({ where:{ email:data.email }});
  if(exists) return res.status(409).json({error:"email_in_use"});
  const user = await prisma.user.create({ data:{ email:data.email, password:bcrypt.hashSync(data.password,10), name:data.name||null }});
  res.json({ token:sign(user), user:{ id:user.id, email:user.email }});
});

app.post("/api/auth/login", async (req,res)=>{
  const { email, password } = req.body||{};
  const user = await prisma.user.findUnique({ where:{ email }});
  if(!user || !bcrypt.compareSync(password,user.password)) return res.status(401).json({error:"invalid_credentials"});
  res.json({ token:sign(user), user:{ id:user.id, email:user.email }});
});

// Tenants
app.post("/api/tenants", auth, async (req,res)=>{
  const name = z.string().min(2).parse(req.body?.name);
  const slug = slugify(name, {lower:true, strict:true});
  const t = await prisma.tenant.create({ data:{ name, slug }});
  await prisma.membership.create({ data:{ userId:req.user.id, tenantId:t.id, role:"OWNER" }});
  res.json({ tenant:t });
});

app.get("/api/tenants", async (_req,res)=>{
  const t = await prisma.tenant.findMany({ select:{ name:true, slug:true, createdAt:true }, orderBy:{ createdAt:"desc" }, take:100 });
  res.json(t);
});

// Places
app.post("/api/t/:slug/places", auth, sellerGuard, async (req,res)=>{
  const schema = z.object({
    title: z.string().min(2),
    description: z.string().optional(),
    point: z.object({ type: z.literal("Point"), coordinates: z.tuple([z.number(), z.number()]) }),
    tags: z.array(z.string()).optional()
  });
  const body = schema.parse(req.body);
  const place = await prisma.place.create({
    data: { tenantId:req.tenant.id, title:body.title, description:body.description||null, point:body.point, tags: body.tags||[] }
  });
  const keys = await redis.keys(`cache:places:${req.params.slug}:*`);
  if(keys.length) await redis.del(...keys);
  res.json(place);
});

// Busca por bbox + texto (com cache simples)
app.get("/api/t/:slug/places", async (req,res)=>{
  const { slug } = req.params;
  const q = (req.query.q||"").toString().trim();
  const bbox = (req.query.bbox||"").toString();
  const key = `cache:places:${slug}:q=${q||"_"}:bbox=${bbox||"_"}`;
  const c = await redis.get(key); if(c) return res.json(JSON.parse(c));

  const tenant = await prisma.tenant.findUnique({ where:{ slug }});
  if(!tenant) return res.status(404).json({error:"tenant_not_found"});

  const raw = await prisma.place.findMany({ where:{ tenantId: tenant.id, active:true }, orderBy:{ createdAt:"desc" }, take: 400 });
  let list = raw;

  if(q){
    const qq = q.toLowerCase();
    list = list.filter(p =>
      (p.title?.toLowerCase().includes(qq)) ||
      (p.description?.toLowerCase().includes(qq)) ||
      (p.tags||[]).some(t => t.toLowerCase().includes(qq))
    );
  }

  if(bbox){
    const [minLng, minLat, maxLng, maxLat] = bbox.split(",").map(Number);
    list = list.filter(p => {
      const [lng, lat] = p.point.coordinates;
      return lng>=minLng && lng<=maxLng && lat>=minLat && lat<=maxLat;
    });
  }

  await redis.setex(key, 30, JSON.stringify(list));
  res.json(list);
});

// Geocodificação (proxy Nominatim)
app.get("/api/geo/geocode", async (req,res)=>{
  const q = (req.query.q||"").toString().trim();
  if(!q) return res.json([]);
  const cacheKey = `geocode:${q}`;
  const cc = await redis.get(cacheKey); if(cc) return res.json(JSON.parse(cc));
  const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5`, { headers:{ "User-Agent":"geo-b2b" }});
  const data = await r.json();
  await redis.setex(cacheKey, 3600, JSON.stringify(data));
  res.json(data);
});

const port = 4000;
app.listen(port, ()=>console.log("API on :"+port));
