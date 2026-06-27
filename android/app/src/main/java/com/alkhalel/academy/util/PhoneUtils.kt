package com.alkhalel.academy.util

object PhoneUtils {

    /**
     * Normalize a raw phone number to E.164 format.
     * For Syrian numbers (+963), accepts:
     *   9XXXXXXXX, 09XXXXXXXX, 9639XXXXXXXX, +9639XXXXXXXX
     * and normalizes to +9639XXXXXXXX
     *
     * For non-Syrian numbers, strips non-digits and returns cleaned string.
     * Returns null for empty/invalid input.
     */
    fun normalizePhone(raw: String?): String? {
        if (raw.isNullOrBlank()) return null

        val s = raw.replace(Regex("[\\s\\-\\(\\)]"), "")

        if (Regex("^\\+9639\\d{8}$").matches(s)) return s

        if (Regex("^\\+\\d{7,15}$").matches(s) && !s.startsWith("+963")) return s

        val digits = s.replace(Regex("\\D"), "")
        if (digits.isEmpty()) return null

        if (Regex("^9639\\d{8}$").matches(digits)) return "+963$digits"
        if (Regex("^09\\d{8}$").matches(digits)) return "+9639${digits.substring(2)}"
        if (Regex("^9\\d{8}$").matches(digits)) return "+963$digits"

        if (digits.length == 8) return "+9639$digits"

        if (digits.startsWith("963") || digits.startsWith("+963")) return null

        return digits
    }
}
