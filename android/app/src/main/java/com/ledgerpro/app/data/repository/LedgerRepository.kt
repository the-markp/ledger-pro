package com.ledgerpro.app.data.repository

import com.ledgerpro.app.data.api.ApiClient
import com.ledgerpro.app.data.model.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class LedgerRepository {

    private val api = ApiClient.getService()

    suspend fun checkServer(): Result<ServerStatus> = withContext(Dispatchers.IO) {
        try {
            val response = ApiClient.getService().getServerStatus()
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Server returned status: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun login(username: String, pin: String): Result<LoginResponse> = withContext(Dispatchers.IO) {
        try {
            val response = ApiClient.getService().login(LoginRequest(username, pin))
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception(response.errorBody()?.string() ?: "Invalid login credentials"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getTransactions(status: String? = null, search: String? = null): Result<List<Transaction>> = withContext(Dispatchers.IO) {
        try {
            val response = ApiClient.getService().getTransactions(status, search)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Failed to fetch transactions: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun createTransaction(transaction: Transaction): Result<Transaction> = withContext(Dispatchers.IO) {
        try {
            val response = ApiClient.getService().createTransaction(transaction)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Failed to create transaction: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun recordPayment(transactionId: String, paymentRequest: PaymentRequest): Result<Transaction> = withContext(Dispatchers.IO) {
        try {
            val response = ApiClient.getService().recordPayment(transactionId, paymentRequest)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Failed to record payment: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getCompanyProfile(): Result<CompanyProfile> = withContext(Dispatchers.IO) {
        try {
            val response = ApiClient.getService().getCompanyProfile()
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Failed to load company profile"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
