import express from 'express';
import cors from 'cors';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { nanoid } from 'nanoid';


// Inicializar base de datos en JSON
const adapter = new JSONFile('db.json');
const db = new Low(adapter, {});

const app = express();
app.use(cors());
app.use(express.json())

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

// Verificar si un email ya está registrado (validación asíncrona)
app.get('/api/auth/check-email/:email', async (req, res) => {
  const email = req.params.email;
  const userExists = db.data.users.some(user => user.email === email);
  res.json({ exists: userExists });
});

// Login
app.post('/api/auth/login', async (req, res) => {
  console.log('Body: ', req.body)
  const { email, password } = req.body;
  console.log(email, password)
  const user = db.data.users.find(u => u.email === email && u.password === password);
  if (!user) {
    return res.status(401).json({ error: 'Credenciales incorrectas' });
  }
  res.json({ message: 'Login exitoso', userId: user.id });
});

// Obtener contactos de un usuario
app.get('/api/contactos/:userId', async (req, res) => {
  const userId = req.params.userId;
  const contactos = db.data.contacts.filter(c => c.userId === userId);
  res.json(contactos);
});

// Añadir un nuevo contacto
app.post('/api/contactos', async (req, res) => {
  const { userId, nombre, email, telefono, direccion } = req.body;
  const newContact = { id: nanoid(), userId, nombre, email, telefono, direccion };
  db.data.contacts.push(newContact);
  await db.write();
  res.json(newContact);
});

// Editar contacto
app.put('/api/contactos/:id', async (req, res) => {
  const id = req.params.id;
  const index = db.data.contacts.findIndex(c => c.id === id);
  if (index === -1) return res.status(404).json({ error: 'Contacto no encontrado' });
  db.data.contacts[index] = { ...db.data.contacts[index], ...req.body };
  await db.write();
  res.json(db.data.contacts[index]);
});

// Eliminar contacto
app.delete('/api/contactos/:id', async (req, res) => {
  const id = req.params.id;
  db.data.contacts = db.data.contacts.filter(c => c.id !== id);
  await db.write();
  res.json({ message: 'Contacto eliminado' });
});

// Iniciar servidor
const PORT = 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en http://localhost:${PORT}`));

