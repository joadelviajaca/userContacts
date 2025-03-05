import express from 'express';
import cors from 'cors';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { nanoid } from 'nanoid';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'tu_clave_secreta'; // Cambia esto por una clave más segura en producción

// Inicializar base de datos en JSON
const adapter = new JSONFile('db.json');
const db = new Low(adapter, {});

const app = express();
app.use(cors());
app.use(express.json());

// Cargar base de datos
async function initDB() {
  await db.read();

  // Asegurarse de que db.data siempre tenga la estructura correcta
  if (!db.data) {
    db.data = { users: [], contacts: [] };
  }

  if (!db.data.users) {
    db.data.users = [];
  }

  if (!db.data.contacts) {
    db.data.contacts = [];
  }

  // Si no hay usuarios, crear datos iniciales
  if (db.data.users.length === 0) {
    db.data.users.push({ id: nanoid(), nombre: "Juan Pérez", email: "juan@example.com", password: "123456" });
    db.data.contacts.push({
      id: nanoid(),
      userId: db.data.users[0].id,
      nombre: "Carlos López",
      email: "carlos@example.com",
      telefono: "123456789",
      direccion: "Calle Mayor 10, Madrid"
    });

    await db.write();
  }
}

initDB();

// Middleware para verificar el token JWT
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Token no proporcionado' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Token inválido' });
    req.user = user;
    next();
  });
}

// Registro de usuario
app.post('/api/auth/register', async (req, res) => {
  const { nombre, email, password } = req.body;
  if (db.data.users.find(user => user.email === email)) {
    return res.status(400).json({ error: 'El email ya está registrado' });
  }
  const newUser = { id: nanoid(), nombre, email, password };
  db.data.users.push(newUser);
  await db.write();
  res.json({ message: 'Usuario registrado correctamente' });
});

// Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = db.data.users.find(u => u.email === email && u.password === password);
  if (!user) {
    return res.status(401).json({ error: 'Credenciales incorrectas' });
  }
  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '1h' });
  res.json({ message: 'Login exitoso', token });
});

// Verificar token
app.get('/api/auth/verify', authenticateToken, (req, res) => {
  const user = req.user;
  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '1h' });
  res.json({ message: 'Token válido', token });
});

// Obtener contactos de un usuario
app.get('/api/contactos/:userId', authenticateToken, async (req, res) => {
  const userId = req.params.userId;
  if (req.user.userId !== userId) {
    return res.status(403).json({ error: 'Acceso denegado' });
  }
  const contactos = db.data.contacts.filter(c => c.userId === userId);
  res.json(contactos);
});

// Recuperar un contacto por su ID
app.get('/api/contactos/contacto/:id', authenticateToken, async (req, res) => {
  const contacto = db.data.contacts.find(c => c.id === req.params.id);
  if (!contacto) return res.status(404).json({ error: 'Contacto no encontrado' });
  if (contacto.userId !== req.user.userId) {
    return res.status(403).json({ error: 'Acceso denegado' });
  }
  res.json(contacto);
});

// Añadir un nuevo contacto
app.post('/api/contactos', authenticateToken, async (req, res) => {
  const { nombre, email, telefono, direccion } = req.body;
  const newContact = { id: nanoid(), userId: req.user.userId, nombre, email, telefono, direccion };
  db.data.contacts.push(newContact);
  await db.write();
  res.json(newContact);
});

// Editar contacto
app.put('/api/contactos/:id', authenticateToken, async (req, res) => {
  const id = req.params.id;
  const contacto = db.data.contacts.find(c => c.id === id);
  if (!contacto) return res.status(404).json({ error: 'Contacto no encontrado' });
  if (contacto.userId !== req.user.userId) {
    return res.status(403).json({ error: 'Acceso denegado' });
  }
  Object.assign(contacto, req.body);
  await db.write();
  res.json(contacto);
});

// Eliminar contacto
app.delete('/api/contactos/:id', authenticateToken, async (req, res) => {
  const id = req.params.id;
  const contacto = db.data.contacts.find(c => c.id === id);
  if (!contacto) return res.status(404).json({ error: 'Contacto no encontrado' });
  if (contacto.userId !== req.user.userId) {
    return res.status(403).json({ error: 'Acceso denegado' });
  }
  db.data.contacts = db.data.contacts.filter(c => c.id !== id);
  await db.write();
  res.json({ message: 'Contacto eliminado' });
});

// Iniciar servidor
const PORT = 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en http://localhost:${PORT}`));
