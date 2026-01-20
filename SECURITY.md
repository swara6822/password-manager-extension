# Security Notice

This project is an educational, work-in-progress Chrome extension.

## Current Security Features
- Master password protection is implemented
- Master password is stored as a hash (not plain text)
- Passwords are stored using chrome.storage.local

## Limitations
- Stored site passwords are NOT encrypted yet
- Anyone with local access to browser storage can read them

## Warning
Do NOT use this extension to store real or sensitive credentials.

## Planned Improvements
- Encryption of stored passwords
- Use master password–derived key for encryption
- Improved autofill heuristics
