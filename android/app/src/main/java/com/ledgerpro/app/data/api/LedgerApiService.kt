package com.ledgerpro.app.data.api

import com.ledgerpro.app.data.model.*
import retrofit2.Response
import retrofit2.http.*

interface LedgerApiService {

    @GET("status")
    suspend fun getServerStatus(): Response<ServerStatus>

    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): Response<LoginResponse>

    @GET("transactions")
    suspend fun getTransactions(
        @Query("status") status: String? = null,
        @Query("search") search: String? = null
    ): Response<List<Transaction>>

    @GET("transactions/{id}")
    suspend fun getTransactionById(@Path("id") id: String): Response<Transaction>

    @POST("transactions")
    suspend fun createTransaction(@Body transaction: Transaction): Response<Transaction>

    @PUT("transactions/{id}")
    suspend fun updateTransaction(
        @Path("id") id: String,
        @Body transaction: Transaction
    ): Response<Transaction>

    @DELETE("transactions/{id}")
    suspend fun deleteTransaction(@Path("id") id: String): Response<Map<String, Any>>

    @PATCH("transactions/{id}/payment")
    suspend fun recordPayment(
        @Path("id") id: String,
        @Body paymentRequest: PaymentRequest
    ): Response<Transaction>

    @GET("company")
    suspend fun getCompanyProfile(): Response<CompanyProfile>

    @GET("users")
    suspend fun getUsers(): Response<List<User>>
}
