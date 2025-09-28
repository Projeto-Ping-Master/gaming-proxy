import request from 'supertest';
import app from '../app';
import { prisma } from '../db';

describe('Authentication Routes', () => {
  describe('POST /api/v1/auth/signup', () => {
    it('should create a new user account', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'testpassword123'
      };

      const response = await request(app)
        .post('/api/v1/auth/signup')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('User created successfully');

      // Verify user was created in database
      const user = await prisma.user.findUnique({
        where: { email: userData.email }
      });
      expect(user).toBeTruthy();
      expect(user!.email).toBe(userData.email);
      expect(user!.verified).toBe(false);
    });

    it('should reject invalid email format', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'testpassword123'
      };

      const response = await request(app)
        .post('/api/v1/auth/signup')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Email inválido');
    });

    it('should reject short password', async () => {
      const userData = {
        email: 'test2@example.com',
        password: '123'
      };

      const response = await request(app)
        .post('/api/v1/auth/signup')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('8');
    });

    it('should reject duplicate email', async () => {
      const userData = {
        email: 'test3@example.com',
        password: 'testpassword123'
      };

      // Create first user
      await request(app)
        .post('/api/v1/auth/signup')
        .send(userData)
        .expect(201);

      // Try to create duplicate
      const response = await request(app)
        .post('/api/v1/auth/signup')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('User already exists');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      // Create a verified user for login tests
      const userData = {
        email: 'logintest@example.com',
        password: 'testpassword123'
      };

      await request(app)
        .post('/api/v1/auth/signup')
        .send(userData);

      // Manually verify the user
      await prisma.user.update({
        where: { email: userData.email },
        data: { verified: true }
      });
    });

    it('should login with valid credentials', async () => {
      const loginData = {
        email: 'logintest@example.com',
        password: 'testpassword123'
      };

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.jwt).toBeTruthy();
      expect(response.body.data.refresh).toBeTruthy();
      expect(response.body.data.user.email).toBe(loginData.email);
    });

    it('should reject invalid password', async () => {
      const loginData = {
        email: 'logintest@example.com',
        password: 'wrongpassword'
      };

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should reject unverified user', async () => {
      // Create unverified user
      const userData = {
        email: 'unverified@example.com',
        password: 'testpassword123'
      };

      await request(app)
        .post('/api/v1/auth/signup')
        .send(userData);

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(userData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('verify');
    });
  });

  describe('GET /api/v1/auth/me', () => {
    let authToken: string;

    beforeEach(async () => {
      // Create and login user
      const userData = {
        email: 'metest@example.com',
        password: 'testpassword123'
      };

      await request(app)
        .post('/api/v1/auth/signup')
        .send(userData);

      await prisma.user.update({
        where: { email: userData.email },
        data: { verified: true }
      });

      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send(userData);

      authToken = loginResponse.body.data.jwt;
    });

    it('should return user info with valid token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe('metest@example.com');
    });

    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('No token provided');
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid token');
    });
  });
});