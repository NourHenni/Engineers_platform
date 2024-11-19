# **Engineers Platform API**
---

## **Table of Contents**
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [API Endpoints](#api-endpoints)
  - [Create User](#create-user)
  - [Login](#login)
  - [Get Users](#get-users)
- [Authentication](#authentication)
- [Error Handling](#error-handling)
- [Testing](#testing)

---

## **Installation**

To set up and run the API locally, follow these steps:

### **1. Clone the repository**

```bash
git clone https://github.com/yourusername/engineers-platform-api.git
cd engineers-platform-api
```

### **2. Install dependencies**

```bash
npm install
```

### **3. Set up environment variables**

Create a `.env` file in the root of the project and populate it with the following:

```plaintext
NODE_ENV=development
PORT=5000
DEV_DATABASE=mongodb://localhost:27017/engineers
PROD_DATABASE=mongodb://your-production-db-uri
JWT_SECRET=your_jwt_secret_key
```

- **NODE_ENV**: Set to `production` or `development` based on your environment.
- **PORT**: The port where the server will run (default is `5000`).
- **DEV_DATABASE**: URI for the local MongoDB instance (for development).
- **PROD_DATABASE**: URI for your MongoDB instance in production.
- **JWT_SECRET**: Secret key used for signing JWT tokens.

### **4. Start the server**

```bash
npm start
```

The server will run on [http://localhost:5000](http://localhost:5000).

---

## **API Endpoints**

### **1. POST `/api/users/createUser`**
This endpoint is used to create a new user.

**Request body:**

```json
{
  "nom": "John",
  "prenom": "Doe",
  "cin": 123456,
  "adresseEmail": "johndoe@example.com",
  "password": "securepassword123",
  "role": "etudiant"
}
```

- **nom**: First name of the user.
- **prenom**: Last name of the user.
- **cin**: Unique identification number (e.g., national ID number).
- **adresseEmail**: The user's email address (must be unique).
- **password**: The user's password.
- **role**: The role of the user (possible values: `etudiant`, `enseignant`, `admin`).

**Response:**

```json
{
  "message": "User created successfully",
  "model": {
    "nom": "John",
    "prenom": "Doe",
    "cin": 123456,
    "adresseEmail": "johndoe@example.com",
    "role": "etudiant",
    "createdAt": "2024-11-19T12:00:00Z",
    "updatedAt": "2024-11-19T12:00:00Z"
  }
}
```

**Error Response:**

- **400**: If the email already exists.
- **400**: If the required fields are missing.
  
---

### **2. POST `/api/users/login`**
This endpoint is used to authenticate a user and obtain a JWT token.

**Request body:**

```json
{
  "adresseEmail": "johndoe@example.com",
  "password": "securepassword123"
}
```

- **adresseEmail**: The user's email address.
- **password**: The user's password.

**Response:**

```json
{
  "token": "your-jwt-token-here"
}
```

- **token**: A JWT token used for authentication in protected routes.

**Error Response:**

- **401**: If the credentials are incorrect.

---

### **3. GET `/api/users/getUsers`**
This endpoint returns a list of all users. It is protected and requires authentication.

**Headers:**

- **Authorization**: Include the `Bearer` token obtained from the `/login` endpoint.

Example header:

```plaintext
Authorization: Bearer your-jwt-token-here
```

**Response:**

```json
{
  "message": "success",
  "model": [
    {
      "nom": "John",
      "prenom": "Doe",
      "cin": 123456,
      "adresseEmail": "johndoe@example.com",
      "role": "etudiant",
      "createdAt": "2024-11-19T12:00:00Z",
      "updatedAt": "2024-11-19T12:00:00Z"
    },
    ...
  ]
}
```

**Error Response:**

- **401**: If the request is not authenticated or the token is invalid.
- **403**: If the user is not an admin (only admins can view all users).

---

## **Authentication**

- **JWT Token**: For secure routes like `/getUsers`, you must pass a valid JWT token in the **Authorization** header.
- **Token Expiration**: The token expires in one hour (1h). You will need to re-login to obtain a new token.

---

## **Error Handling**

The API returns various HTTP status codes based on the outcome of the request:

- **200**: OK — The request was successful.
- **201**: Created — The resource was successfully created.
- **400**: Bad Request — The request was malformed or missing parameters.
- **401**: Unauthorized — Authentication failed or token is missing/invalid.
- **403**: Forbidden — The user does not have permission to access the resource.
- **500**: Internal Server Error — An unexpected error occurred on the server.

---

## **Testing**

For testing the API, you can use tools like [Postman](https://www.postman.com/) or [Insomnia](https://insomnia.rest/).

1. **Create a user** by sending a `POST` request to `/api/users/createUser` with the required body.
2. **Login** to obtain a JWT token by sending a `POST` request to `/api/users/login` with the user's email and password.
3. **Get users** by sending a `GET` request to `/api/users/getUsers` with the `Authorization` header containing the JWT token.

---