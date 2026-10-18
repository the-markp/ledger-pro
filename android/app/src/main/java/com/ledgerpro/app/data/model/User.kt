package com.ledgerpro.app.data.model

import com.google.gson.annotations.SerializedName

data class User(
    val id: String = "USR-001",
    val username: String = "admin",
    @SerializedName(value = "fullName", alternate = ["full_name"])
    val fullName: String = "System Administrator",
    val role: String = "admin", // "admin", "editor", "viewer"
    @SerializedName(value = "isActive", alternate = ["is_active"])
    val isActive: Boolean = true,
    @SerializedName(value = "createdAt", alternate = ["created_at"])
    val createdAt: String = "",
    @SerializedName(value = "lastLoginAt", alternate = ["last_login_at"])
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
    val status: String = "online",
    val app: String = "LedgerPro",
    val service: String = "Backend API Service",
    val version: String = "2.1.0",
    val currency: String = "PHP",
    val timestamp: String = ""
)

data class CompanyProfile(
    @SerializedName(value = "companyName", alternate = ["company_name"])
    val companyName: String = "Vertex Engineering & Design Consultancy",
    val tagline: String = "Civil, Structural & MEPFS Engineering Services",
    @SerializedName(value = "logoIcon", alternate = ["logo_icon"])
    val logoIcon: String = "building",
    @SerializedName(value = "logoUrl", alternate = ["logo_url", "logoImage", "logo_image"])
    val logoUrl: String? = null,
    @SerializedName(value = "accentColor", alternate = ["accent_color"])
    val accentColor: String = "#4f46e5",
    val address: String = "Suite 804, Cybergate Center, Ortigas Ave, Pasig City, Philippines",
    @SerializedName(value = "contactInfo", alternate = ["contact_info"])
    val contactInfo: String = "inquiries@vertexeng.com",
    @SerializedName(value = "tinNumber", alternate = ["tin_number"])
    val tinNumber: String = "TIN: 240-891-342-000",
    @SerializedName(value = "signatoryName", alternate = ["signatory_name"])
    val signatoryName: String = "Engr. Roberto D. Cruz, PE",
    @SerializedName(value = "signatoryTitle", alternate = ["signatory_title"])
    val signatoryTitle: String = "Managing Principal"
)
