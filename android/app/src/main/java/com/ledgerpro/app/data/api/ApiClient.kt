package com.ledgerpro.app.data.api

import android.content.Context
import android.content.SharedPreferences
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object ApiClient {

    private const val PREFS_NAME = "ledgerpro_server_prefs"
    private const val KEY_SERVER_URL = "server_url"
    
    // Default URL: 10.0.2.2 maps to host machine localhost in Android Emulator
    const val DEFAULT_EMULATOR_URL = "http://10.0.2.2:3000/api/"

    private var currentBaseUrl: String = DEFAULT_EMULATOR_URL
    private var retrofit: Retrofit? = null
    private var apiService: LedgerApiService? = null

    fun initialize(context: Context) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        currentBaseUrl = prefs.getString(KEY_SERVER_URL, DEFAULT_EMULATOR_URL) ?: DEFAULT_EMULATOR_URL
        rebuildRetrofit()
    }

    fun getServerUrl(): String = currentBaseUrl

    fun updateServerUrl(context: Context, newUrl: String) {
        var formatted = newUrl.trim()
        if (!formatted.endsWith("/")) {
            formatted += "/"
        }
        if (!formatted.endsWith("api/")) {
            formatted += "api/"
        }
        currentBaseUrl = formatted
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit().putString(KEY_SERVER_URL, currentBaseUrl).apply()
        rebuildRetrofit()
    }

    private fun rebuildRetrofit() {
        val logging = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
        }

        val okHttpClient = OkHttpClient.Builder()
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(20, TimeUnit.SECONDS)
            .writeTimeout(20, TimeUnit.SECONDS)
            .addInterceptor(logging)
            .build()

        retrofit = Retrofit.Builder()
            .baseUrl(currentBaseUrl)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()

        apiService = retrofit?.create(LedgerApiService::class.java)
    }

    fun getService(): LedgerApiService {
        if (apiService == null) {
            rebuildRetrofit()
        }
        return apiService!!
    }
}
