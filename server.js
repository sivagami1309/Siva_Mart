require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();

const PORT = process.env.PORT || 3000;
const secret = process.env.JWT_SECRET;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

/* =========================================================
   SWAGGER
========================================================= */

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SIVA_MART API',
      version: '1.0.0',
      description: 'SIVA_MART E-Commerce Backend API'
    },
    servers: [
      {
        url: 'http://localhost:3000'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  },
  apis: [path.join(__dirname, 'server.js')]
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    explorer: true
  })
);

/* =========================================================
   AUTHENTICATION
========================================================= */

function requireUser(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';

    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        message: 'Please log in first.'
      });
    }

    const token = authHeader.substring(7);

    if (!secret) {
      return res.status(500).json({
        message: 'JWT_SECRET is missing.'
      });
    }

    req.user = jwt.verify(token, secret);
    next();

  } catch (error) {
    return res.status(401).json({
      message: 'Invalid or expired token.'
    });
  }
}

function requireSeller(req, res, next) {
  if (req.user.role !== 'seller') {
    return res.status(403).json({
      message: 'Seller access required.'
    });
  }

  next();
}

function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      message: 'Admin access required.'
    });
  }

  next();
}

/* =========================================================
   HEALTH
========================================================= */

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');

    res.json({
      status: 'OK',
      message: 'SIVA_MART backend and database are working.'
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      status: 'ERROR',
      message: 'Database connection failed.'
    });
  }
});

/* =========================================================
   PRODUCTS
========================================================= */

app.get('/api/products', async (req, res, next) => {
  try {
    const search = `%${req.query.search || ''}%`;
    const category = req.query.category || '';

    const result = await pool.query(
      `
      SELECT
        p.*,
        c.name AS category
      FROM products p
      JOIN categories c ON c.id = p.category_id
      WHERE p.is_active = true
        AND (
          p.name ILIKE $1
          OR p.description ILIKE $1
        )
        AND ($2 = '' OR c.name = $2)
      ORDER BY p.id
      `,
      [search, category]
    );

    res.json(result.rows);

  } catch (error) {
    next(error);
  }
});

/* =========================================================
   CATEGORIES
========================================================= */

app.get('/api/categories', async (_req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, name FROM categories ORDER BY name`
    );

    res.json(result.rows);

  } catch (error) {
    next(error);
  }
});

/* =========================================================
   REGISTER
========================================================= */

app.post('/api/auth/register', async (req, res, next) => {
  try {
    const name = String(
      req.body.name || req.body.full_name || ''
    ).trim();

    const email = String(
      req.body.email || ''
    ).trim().toLowerCase();

    const password = String(
      req.body.password || ''
    );

    if (!name || !email) {
      return res.status(400).json({
        message: 'Name and email are required.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: 'Password must contain at least 6 characters.'
      });
    }

    const existing = await pool.query(
      `SELECT id FROM users WHERE LOWER(email)=LOWER($1)`,
      [email]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({
        message: 'That email is already registered.'
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await pool.query(
      `
      INSERT INTO users
      (full_name,email,password_hash,role)
      VALUES ($1,$2,$3,'buyer')
      RETURNING id,full_name,email,role
      `,
      [name, email, passwordHash]
    );

    const user = result.rows[0];

    const token = jwt.sign(
      {
        id: user.id,
        name: user.full_name,
        email: user.email,
        role: user.role
      },
      secret,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Registration successful.',
      user,
      token
    });

  } catch (error) {
    next(error);
  }
});

/* =========================================================
   LOGIN
========================================================= */

app.post('/api/auth/login', async (req, res, next) => {
  try {
    const email = String(req.body.email || '')
      .trim()
      .toLowerCase();

    const password = String(req.body.password || '');

    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password are required.'
      });
    }

    const result = await pool.query(
      `
      SELECT
        id,
        full_name,
        email,
        password_hash,
        role
      FROM users
      WHERE LOWER(email)=LOWER($1)
      LIMIT 1
      `,
      [email]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({
        message: 'Email or password is incorrect.'
      });
    }

    const valid = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!valid) {
      return res.status(401).json({
        message: 'Email or password is incorrect.'
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        name: user.full_name,
        email: user.email,
        role: user.role
      },
      secret,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful.',
      user: {
        id: user.id,
        name: user.full_name,
        email: user.email,
        role: user.role
      },
      token
    });

  } catch (error) {
    next(error);
  }
});

/* =========================================================
   CURRENT USER
========================================================= */

app.get('/api/auth/me', requireUser, async (req, res, next) => {
  try {
    const result = await pool.query(
      `
      SELECT id,full_name,email,role
      FROM users
      WHERE id=$1
      `,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'User not found.'
      });
    }

    const user = result.rows[0];

    res.json({
      id: user.id,
      name: user.full_name,
      full_name: user.full_name,
      email: user.email,
      role: user.role
    });

  } catch (error) {
    next(error);
  }
});

/* =========================================================
   SELLER - GET MY PRODUCTS
========================================================= */

app.get(
  '/api/seller/products',
  requireUser,
  requireSeller,
  async (req, res, next) => {
    try {
      const seller = await pool.query(
        `
        SELECT id
        FROM sellers
        WHERE user_id=$1
        LIMIT 1
        `,
        [req.user.id]
      );

      if (seller.rows.length === 0) {
        return res.status(404).json({
          message: 'Seller profile not found.'
        });
      }

      const result = await pool.query(
        `
        SELECT
          p.*,
          c.name AS category
        FROM products p
        LEFT JOIN categories c
          ON c.id=p.category_id
        WHERE p.seller_id=$1
        ORDER BY p.id DESC
        `,
        [seller.rows[0].id]
      );

      res.json(result.rows);

    } catch (error) {
      next(error);
    }
  }
);

/* =========================================================
   SELLER - ADD PRODUCT
========================================================= */

app.post(
  '/api/seller/products',
  requireUser,
  requireSeller,
  async (req, res, next) => {
    try {
      const {
        name,
        description,
        price,
        stock,
        category_id,
        image_url
      } = req.body;

      if (!name || price === undefined || stock === undefined || !category_id) {
        return res.status(400).json({
          message: 'Name, price, stock and category are required.'
        });
      }

      const seller = await pool.query(
        `
        SELECT id
        FROM sellers
        WHERE user_id=$1
        LIMIT 1
        `,
        [req.user.id]
      );

      if (seller.rows.length === 0) {
        return res.status(404).json({
          message: 'Seller profile not found.'
        });
      }

      const result = await pool.query(
        `
        INSERT INTO products
        (
          seller_id,
          category_id,
          name,
          description,
          price,
          stock,
          image_url,
          is_active
        )
        VALUES
        ($1,$2,$3,$4,$5,$6,$7,true)
        RETURNING *
        `,
        [
          seller.rows[0].id,
          category_id,
          name,
          description || '',
          price,
          stock,
          image_url || ''
        ]
      );

      res.status(201).json({
        message: 'Product added successfully.',
        product: result.rows[0]
      });

    } catch (error) {
      next(error);
    }
  }
);

/* =========================================================
   SELLER - EDIT PRODUCT
========================================================= */

app.put(
  '/api/seller/products/:id',
  requireUser,
  requireSeller,
  async (req, res, next) => {
    try {
      const productId = Number(req.params.id);

      const seller = await pool.query(
        `
        SELECT id
        FROM sellers
        WHERE user_id=$1
        LIMIT 1
        `,
        [req.user.id]
      );

      if (seller.rows.length === 0) {
        return res.status(404).json({
          message: 'Seller profile not found.'
        });
      }

      const {
        name,
        description,
        price,
        stock,
        category_id,
        image_url
      } = req.body;

      const result = await pool.query(
        `
        UPDATE products
        SET
          name=COALESCE($1,name),
          description=COALESCE($2,description),
          price=COALESCE($3,price),
          stock=COALESCE($4,stock),
          category_id=COALESCE($5,category_id),
          image_url=COALESCE($6,image_url)
        WHERE id=$7
          AND seller_id=$8
        RETURNING *
        `,
        [
          name,
          description,
          price,
          stock,
          category_id,
          image_url,
          productId,
          seller.rows[0].id
        ]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          message: 'Product not found or not owned by you.'
        });
      }

      res.json({
        message: 'Product updated successfully.',
        product: result.rows[0]
      });

    } catch (error) {
      next(error);
    }
  }
);

/* =========================================================
   SELLER - DELETE PRODUCT
========================================================= */

app.delete(
  '/api/seller/products/:id',
  requireUser,
  requireSeller,
  async (req, res, next) => {
    try {
      const productId = Number(req.params.id);

      const seller = await pool.query(
        `
        SELECT id
        FROM sellers
        WHERE user_id=$1
        LIMIT 1
        `,
        [req.user.id]
      );

      if (seller.rows.length === 0) {
        return res.status(404).json({
          message: 'Seller profile not found.'
        });
      }

      const result = await pool.query(
        `
        UPDATE products
        SET is_active=false
        WHERE id=$1
          AND seller_id=$2
        RETURNING id,name
        `,
        [
          productId,
          seller.rows[0].id
        ]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          message: 'Product not found.'
        });
      }

      res.json({
        message: 'Product deleted successfully.'
      });

    } catch (error) {
      next(error);
    }
  }
);

/* =========================================================
   ADMIN - STATISTICS
========================================================= */

app.get(
  '/api/admin/stats',
  requireUser,
  requireAdmin,
  async (_req, res, next) => {
    try {
      const result = await pool.query(`
        SELECT
          (SELECT COUNT(*) FROM users) AS users,
          (SELECT COUNT(*) FROM sellers) AS sellers,
          (SELECT COUNT(*) FROM products) AS products,
          (SELECT COUNT(*) FROM orders) AS orders
      `);

      res.json(result.rows[0]);

    } catch (error) {
      next(error);
    }
  }
);

/* =========================================================
   ADMIN - USERS
========================================================= */

app.get(
  '/api/admin/users',
  requireUser,
  requireAdmin,
  async (_req, res, next) => {
    try {
      const result = await pool.query(`
        SELECT
          id,
          full_name,
          email,
          role
        FROM users
        ORDER BY id DESC
      `);

      res.json(result.rows);

    } catch (error) {
      next(error);
    }
  }
);

/* =========================================================
   ADMIN - SELLERS
========================================================= */

app.get(
  '/api/admin/sellers',
  requireUser,
  requireAdmin,
  async (_req, res, next) => {
    try {
      const result = await pool.query(`
        SELECT
          s.id,
          s.store_name,
          u.id AS user_id,
          u.full_name,
          u.email
        FROM sellers s
        JOIN users u ON u.id=s.user_id
        ORDER BY s.id DESC
      `);

      res.json(result.rows);

    } catch (error) {
      next(error);
    }
  }
);

/* =========================================================
   ADMIN - PRODUCTS
========================================================= */

app.get(
  '/api/admin/products',
  requireUser,
  requireAdmin,
  async (_req, res, next) => {
    try {
      const result = await pool.query(`
        SELECT
          p.*,
          c.name AS category,
          s.store_name
        FROM products p
        LEFT JOIN categories c
          ON c.id=p.category_id
        LEFT JOIN sellers s
          ON s.id=p.seller_id
        ORDER BY p.id DESC
      `);

      res.json(result.rows);

    } catch (error) {
      next(error);
    }
  }
);

/* =========================================================
   ADMIN - DELETE PRODUCT
========================================================= */

app.delete(
  '/api/admin/products/:id',
  requireUser,
  requireAdmin,
  async (req, res, next) => {
    try {
      const result = await pool.query(
        `
        UPDATE products
        SET is_active=false
        WHERE id=$1
        RETURNING id,name
        `,
        [Number(req.params.id)]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          message: 'Product not found.'
        });
      }

      res.json({
        message: 'Product removed successfully.'
      });

    } catch (error) {
      next(error);
    }
  }
);

/* =========================================================
   ADMIN - ORDERS
========================================================= */

app.get(
  '/api/admin/orders',
  requireUser,
  requireAdmin,
  async (_req, res, next) => {
    try {
      const result = await pool.query(`
        SELECT
          o.id,
          o.order_number,
          o.total_amount,
          o.order_status,
          o.created_at,
          u.full_name,
          u.email
        FROM orders o
        JOIN users u
          ON u.id=o.user_id
        ORDER BY o.created_at DESC
      `);

      res.json(result.rows);

    } catch (error) {
      next(error);
    }
  }
);

/* =========================================================
   PLACE ORDER
========================================================= */

app.post('/api/orders', requireUser, async (req, res) => {
  const client = await pool.connect();

  try {
    const items = req.body.items;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        message: 'Your cart is empty.'
      });
    }

    await client.query('BEGIN');

    let total = 0;
    const verifiedItems = [];

    for (const item of items) {
      const productId = Number(item.productId);
      const quantity = Number(item.quantity);

      if (!Number.isInteger(productId)) {
        throw new Error('Invalid product.');
      }

      if (!Number.isInteger(quantity) || quantity < 1) {
        throw new Error('Invalid quantity.');
      }

      const result = await client.query(
        `
        SELECT id,name,price,stock
        FROM products
        WHERE id=$1
          AND is_active=true
        FOR UPDATE
        `,
        [productId]
      );

      const product = result.rows[0];

      if (!product) {
        throw new Error('Product not found.');
      }

      if (Number(product.stock) < quantity) {
        throw new Error(`${product.name} is out of stock.`);
      }

      total += Number(product.price) * quantity;

      verifiedItems.push({
        product,
        quantity
      });
    }

    const userResult = await client.query(
      `
      SELECT id,full_name,email
      FROM users
      WHERE id=$1
      `,
      [req.user.id]
    );

    const user = userResult.rows[0];

    if (!user) {
      throw new Error('User not found.');
    }

    const orderNumber =
      `SM-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const orderResult = await client.query(
      `
      INSERT INTO orders
      (
        order_number,
        user_id,
        subtotal,
        discount_amount,
        delivery_fee,
        tax_amount,
        total_amount,
        shipping_full_name,
        shipping_phone,
        shipping_address,
        shipping_city,
        shipping_state,
        shipping_pincode
      )
      VALUES
      ($1,$2,$3,0,0,0,$3,$4,$5,$6,$7,$8,$9)
      RETURNING
        id,
        order_number,
        subtotal,
        total_amount,
        order_status,
        created_at
      `,
      [
        orderNumber,
        user.id,
        total,
        user.full_name,
        '0000000000',
        'Siva Mart Address',
        'Chennai',
        'Tamil Nadu',
        '600001'
      ]
    );

    const order = orderResult.rows[0];

    for (const item of verifiedItems) {
      await client.query(
        `
        INSERT INTO order_items
        (order_id,product_id,quantity,price)
        VALUES ($1,$2,$3,$4)
        `,
        [
          order.id,
          item.product.id,
          item.quantity,
          item.product.price
        ]
      );

      await client.query(
        `
        UPDATE products
        SET stock=stock-$1
        WHERE id=$2
        `,
        [
          item.quantity,
          item.product.id
        ]
      );
    }

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Order placed successfully.',
      order
    });

  } catch (error) {
    await client.query('ROLLBACK');

    console.error('CHECKOUT ERROR:', error);

    res.status(400).json({
      message: error.message || 'Could not place order.'
    });

  } finally {
    client.release();
  }
});

/* =========================================================
   MY ORDERS
========================================================= */

app.get('/api/orders/me', requireUser, async (req, res, next) => {
  try {
    const result = await pool.query(
      `
      SELECT
        id,
        order_number,
        subtotal,
        discount_amount,
        delivery_fee,
        tax_amount,
        total_amount,
        order_status,
        created_at
      FROM orders
      WHERE user_id=$1
      ORDER BY created_at DESC
      `,
      [req.user.id]
    );

    res.json(result.rows);

  } catch (error) {
    next(error);
  }
});

/* =========================================================
   ROOT
========================================================= */

app.get('/', (_req, res) => {
  res.sendFile(
    path.join(__dirname, 'public', 'index.html')
  );
});

/* =========================================================
   ERROR HANDLER
========================================================= */

app.use('/api', (_req, res) => {
  res.status(404).json({
    message: 'API endpoint not found.'
  });
});

app.use((error, _req, res, _next) => {
  console.error('SERVER ERROR:', error);

  res.status(500).json({
    message: 'Something went wrong on the server.'
  });
});

/* =========================================================
   START
========================================================= */

app.listen(PORT, () => {
  console.log('');
  console.log('==========================================');
  console.log('        SIVA_MART BACKEND STARTED');
  console.log('==========================================');
  console.log(`Website : http://localhost:${PORT}`);
  console.log(`API     : http://localhost:${PORT}/api`);
  console.log(`Swagger : http://localhost:${PORT}/api-docs`);
  console.log(`Health  : http://localhost:${PORT}/api/health`);
  console.log('==========================================');
  console.log('');
});