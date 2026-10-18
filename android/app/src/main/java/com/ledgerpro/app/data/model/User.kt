package com.ledgerpro.app.data.model

data class User(
    val id: String,
    val username: String,
    val fullName: String,
    val role: String, // "admin", "editor", "viewer"
    val isActive: Boolean = true,
    val createdAt: String = "",
    val lastLoginAt: String? = null
) {
    val isAdmin: Boolean get() = role.equals("admin", ignoreCase = true)
    val isEditor: Boolean get() = role.equals("editor", ignoreCase = true)
    val canModify: Boolean get() = isAdmin || isEditor
}

data class LoginRequest(
    val username: String,
    val pin: String
)

data class LoginResponse(
    val success: Boolean,
    val user: User?,
    val token: String?,
    val message: String?
)

data class ServerStatus(
    val status: String,
    val app: String,
    val service: String,
    val version: String,
    val currency: String,
    val timestamp: String
)

data class CompanyProfile(
    val companyName: String = "Vertex Engineering",
    val tagline: String = "Engineering & Design Consultancy",
    val logoIcon: String = "building",
    val accentColor: String = "#4f46e5",
    val address: String = "Ortigas Ave, Pasig City, Philippines",
    val contactInfo: String = "inquiries@vertexeng.com",
    val tinNumber: String = "TIN: 240-891-342-000",
    val signatoryName: String = "Engr. Roberto D. Cruz, PE",
    val signatoryTitle: String = "Managing Principal"
)
