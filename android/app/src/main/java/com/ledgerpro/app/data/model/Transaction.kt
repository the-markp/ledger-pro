package com.ledgerpro.app.data.model

import com.google.gson.annotations.SerializedName

enum class PaymentStatus {
    @SerializedName("Paid")
    PAID,
    @SerializedName("Partially Paid")
    PARTIALLY_PAID,
    @SerializedName("Pending")
    PENDING,
    @SerializedName("Overdue")
    OVERDUE
}

data class Transaction(
    val id: String,
    val date: String,
    val client: String,
    val projectName: String,
    val ee: String = "",
    val pl: String = "",
    val st: String = "",
    val arch: String = "",
    val ece: String = "",
    val me: String = "",
    val others: String = "",
    val purpose: String = "",
    val bill: Double = 0.0,
    val printCost: Double = 0.0,
    val totalBill: Double = 0.0,
    val paymentStatus: String = "Pending",
    val amountPaid: Double = 0.0,
    val balance: Double = 0.0,
    val paymentDate: String? = null,
    val paymentMethod: String? = null,
    val paymentReference: String? = null,
    val remarks: String = "",
    val createdAt: String = "",
    val updatedAt: String = ""
)

data class PaymentRequest(
    val amountPaid: Double,
    val paymentMethod: String,
    val paymentReference: String,
    val paymentDate: String,
    val remarks: String? = null
)
