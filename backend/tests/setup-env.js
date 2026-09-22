// Loaded before every test file (node --import) so that modules read a
// complete, strong configuration.
process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = 'test-only-jwt-secret-0123456789abcdef0123456789'
process.env.ADMIN_EMAIL = 'admin@prescripto.test'
process.env.ADMIN_PASSWORD = 'Adm1n!Test#Passw0rd'
