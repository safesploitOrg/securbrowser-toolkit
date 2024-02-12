# Security Policy

## Reporting a Vulnerability

At SecurBrowser Toolkit, we take security seriously and value the contributions of security researchers in helping us maintain the security of our toolkit. If you discover any security vulnerabilities or issues, we encourage you to responsibly disclose them to us so that we can address them promptly.

To report a security vulnerability, please follow these steps:

1. **Privately Notify Us:** Please do not disclose the vulnerability publicly until we have had a chance to review and address it. You can contact us directly via email at [security@safesploit.com](mailto:security@safesploit.com).

2. **Provide Details:** When reporting the vulnerability, please provide as much detail as possible, including steps to reproduce, the affected components, and any potential impact.

3. **Cooperate with Us:** We may need to work with you to better understand the issue and verify any fixes or patches.

4. **Responsible Disclosure:** Once the vulnerability has been confirmed and addressed, we will work with you to determine an appropriate timeline for public disclosure.

We appreciate your efforts in helping us maintain the security of SecurBrowser Toolkit. Thank you for your cooperation.

## Encryption Standards

The encryption process in the SecurBrowser Toolkit adheres to industry-standard encryption practices to ensure the security of encrypted files. Below are the key standards and practices employed in the encryption process:

### Password-Based Key Derivation Function 2 (PBKDF2)
- **Algorithm:** PBKDF2 is utilized to derive a cryptographic key from the user-provided passphrase.
- **Iterations:** PBKDF2 employs a high number of iterations (10,000) to derive a secure key, making it more resistant to brute force attacks.
- **Salt:** A randomly generated salt value is combined with the passphrase during key derivation, enhancing the security of the derived key.

### Advanced Encryption Standard (AES)
- **Algorithm:** AES, a symmetric encryption algorithm, is employed in Cipher Block Chaining (CBC) mode for encrypting and decrypting files.
- **Key Size:** AES-CBC mode uses a 256-bit key, which is generated from the PBKDF2-derived key bytes.
- **Initialization Vector (IV):** AES-CBC mode requires a 128-bit IV for each encryption operation, which is generated internally by the Web Crypto API.

### Random Salt Generation
- **Purpose:** A random salt value is generated for each encryption operation to introduce randomness and uniqueness to the encryption process.
- **Prevention:** Using a random salt mitigates the risk of rainbow table attacks and ensures that identical plaintexts encrypted with the same passphrase produce different ciphertexts.

### File Format
- **Structure:** Encrypted files follow a specific format for compatibility and security.
- **Header:** Each encrypted file begins with the ASCII string "Salted__" to indicate the use of salt in the encryption process.
- **Content:** The salt value is appended to the file header, followed by the ciphertext.
- **Compatibility:** The file format ensures that decryption algorithms can accurately identify and process encrypted files, preventing data corruption or loss during decryption.

By adhering to these encryption standards and practices, the SecurBrowser Toolkit offers robust security for encrypted files, safeguarding sensitive information from unauthorized access.
