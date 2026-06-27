package com.alkhalel.academy.data.api

import android.content.Context
import android.content.SharedPreferences
import android.os.Build
import android.provider.Settings
import com.alkhalel.academy.BuildConfig
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

object RetrofitClient {

    private var apiService: ApiService? = null
    private var sharedPreferences: SharedPreferences? = null
    private var deviceId: String? = null

    fun init(context: Context) {
        sharedPreferences = context.getSharedPreferences("alkhalel_prefs", Context.MODE_PRIVATE)
        deviceId = Settings.Secure.getString(context.contentResolver, Settings.Secure.ANDROID_ID)
    }

    private fun getAuthToken(): String? {
        return sharedPreferences?.getString("auth_token", null)
    }

    private fun getDeviceId(): String {
        return deviceId ?: Build.MODEL
    }

    fun saveToken(token: String) {
        sharedPreferences?.edit()?.putString("auth_token", token)?.apply()
    }

    fun clearToken() {
        sharedPreferences?.edit()?.remove("auth_token")?.apply()
    }

    fun isLoggedIn(): Boolean {
        return !getAuthToken().isNullOrEmpty()
    }

    fun getApiService(): ApiService {
        if (apiService == null) {
            val authInterceptor = Interceptor { chain ->
                val original = chain.request()
                val builder = original.newBuilder()
                getAuthToken()?.let {
                    builder.addHeader("Authorization", "Bearer $it")
                }
                builder.addHeader("X-Device-ID", getDeviceId())
                chain.proceed(builder.build())
            }

            val loggingInterceptor = HttpLoggingInterceptor().apply {
                level = HttpLoggingInterceptor.Level.BODY
            }

            val client = OkHttpClient.Builder()
                .addInterceptor(authInterceptor)
                .addInterceptor(loggingInterceptor)
                .build()

            val retrofit = Retrofit.Builder()
                .baseUrl(BuildConfig.API_BASE_URL)
                .client(client)
                .addConverterFactory(GsonConverterFactory.create())
                .build()

            apiService = retrofit.create(ApiService::class.java)
        }
        return apiService!!
    }

    fun reset() {
        apiService = null
    }
}
