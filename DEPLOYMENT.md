# Deployment Guide

This document provides instructions for deploying the application to production.

## Environment Setup

The application uses different environment files for development and production:

1. `.env` - Used for local development
   - `REACT_APP_IS_ADMIN=true` - Enables admin features
   - `REACT_APP_DISABLE_ADMIN=false` - Ensures admin features are not disabled
   - `REACT_APP_REQUIRE_LOGIN=false` - No login required for local development

2. `.env.production` - Used for production builds
   - `REACT_APP_IS_ADMIN=false` - Disables admin features in production
   - `REACT_APP_DISABLE_ADMIN=true` - Additional safeguard to disable admin features
   - `REACT_APP_REQUIRE_LOGIN=true` - Requires users to log in to access content

## Firestore Security Rules

The Firestore security rules are designed to work with both development and production environments:

- In development mode, the application adds a special `__dev_mode__` flag to documents
- This flag allows write operations without authentication in development
- In production, the flag is not added, so admin authentication is required

You don't need to manually switch between different rule sets - the same rules work for both environments.

## Building for Production

1. Build the production version of the application:
   ```
   npm run build
   ```

2. Deploy to Firebase Hosting:
   ```
   firebase deploy --only hosting
   ```

## Admin Access

To enable admin access for specific users in production:

1. Create a user account in Firebase Authentication
2. Use the Firebase Admin SDK to set custom claims:
   ```javascript
   admin.auth().setCustomUserClaims(uid, { admin: true });
   ```

## Password Protection

The application uses a simple password protection mechanism:

1. The password is set in the `.env.production` file as `REACT_APP_ACCESS_PASSWORD`
2. Users must enter this password to access the content
3. For better security, consider implementing a more robust authentication system

## Maintenance

- Regularly update dependencies to ensure security
- Monitor Firebase usage to stay within free tier limits
- Backup your Firestore data periodically 