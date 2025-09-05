# Marketplace Metaverse Backend

A professional Node.js microservices backend designed for the **Marketplace Metaverse**, an immersive digital platform connected to Orange's metaverse. It enables partners to securely onboard, manage their profiles, and deliver digital content (advertising banners, videos, images, 3D models) inside the metaverse environment.

## 📌 Project Overview

Built in partnership with Orange, this platform combines:

- Web-based portal for partner onboarding and profile management
- Robust backend for content management and subscriptions
- Integration with ODACAT for offer management
- Secure media handling and delivery system

## 🚀 Key Features

- **User Authentication & Management**
  - Secure JWT-based authentication
  - Partner profile management
  - Role-based access control

- **Media Management**
  - Multi-format file uploads (images, videos, 3D models)
  - Secure file storage and delivery
  - Support for:
    - Images: JPEG, PNG
    - Videos: MP4
    - 3D Models: GLB
    - Logo: JPEG, PNG

- **Subscription & Catalog**
  - Product catalog integration
  - Subscription management
  - Order validation and confirmation flow

- **API Integration**
  - RESTful API architecture
  - Swagger documentation
  - TM Forum-inspired API design

## 💻 Technical Stack

- **Backend Framework**: Node.js + Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **File Handling**: Multer
- **API Documentation**: Swagger/OpenAPI
- **Environment**: Docker support

## 📦 Data Models

### User Model

```javascript
{
  _id: ObjectId,
  email: String,         // Unique identifier
  companyName: String,   // Partner company name
  password: String,      // Hashed password
  address: String,       // Physical address
  zipCode: String,
  city: String,
  country: String,
  logo: ObjectId,        // Reference to Media
  images: [ObjectId],    // Array of Media references
  videos: [ObjectId],    // Array of Media references
  model3d: ObjectId      // Reference to 3D model Media
}
```

### Media Model

```javascript
{
  _id: ObjectId,
  secureId: String,     // Unique public identifier
  type: String,         // 'image', 'video', 'model'
  filename: String,     // Original filename
  size: Number,        // File size in bytes
  mimeType: String,    // MIME type
  data: Buffer,        // File data
  uploadedBy: ObjectId, // Reference to User
  url: String          // Public access URL
}
```

## 🔧 Installation & Setup

### Prerequisites

- Node.js >= 16.x
- MongoDB
- Docker (optional)

### Local Setup

1. Clone the repository

2. Install dependencies:

   ```bash
   npm install
   ```

3. Configure environment variables:
   - Copy `.env.example` to `.env`
   - Update with your configuration

4. Start the server:

   ```bash
   npm start
   ```

### Docker Setup

1. Build the image:

   ```bash
   docker build -t marketplace-backend .
   ```

2. Run the container:

   ```bash
   docker run -p 3000:3000 marketplace-backend
   ```

## 🔒 Security Features

- JWT authentication for all protected routes
- File type validation and size limits
- CORS protection
- Request rate limiting
- Secure password hashing
- Environment-based configurations

## 📚 API Documentation

Access the Swagger documentation at `/api-docs` when the server is running.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

This project is proprietary and confidential. © 2025 Orange. All rights reserved.

---

For questions or support, contact:

- **Maintainer**: Mouheb Sliti
- **Email**: [mouheb.sliti@sofrecom.com](mailto:mouheb.sliti@sofrecom.com)
