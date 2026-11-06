package com.avies.audio

import java.net.URI
import java.nio.ByteBuffer
import java.nio.ByteOrder

/** Byte-level rules shared by the microphone and private WAV recovery file. */
internal object AudioRules {
  const val MAX_BYTES = 8 * 1024 * 1024
  const val FRAME_BYTES = 3200 // mono PCM16 / 16kHz / 100ms
  fun base(input: String): String {
    val u = URI(input)
    val host = u.host ?: error("9002")
    val a = host.split('.').mapNotNull { it.toIntOrNull() }
    val privateIp = host.matches(Regex("[0-9]+\\.[0-9]+\\.[0-9]+\\.[0-9]+")) && a.size == 4 && a.all { it in 0..255 } &&
      (a[0] == 10 || a[0] == 127 || a[0] == 192 && a[1] == 168 || a[0] == 172 && a[1] in 16..31)
    require(u.scheme in listOf("http", "https") && u.rawUserInfo == null && u.rawQuery == null && u.rawFragment == null &&
      (u.path.isNullOrEmpty() || u.path == "/") && (u.scheme == "https" || privateIp || host == "localhost")) { "9002" }
    return input.trimEnd('/')
  }
  fun wavHeader(bytes: Int): ByteArray {
    require(bytes >= 0 && bytes % 2 == 0 && bytes + 44 <= MAX_BYTES)
    return ByteBuffer.allocate(44).order(ByteOrder.LITTLE_ENDIAN).apply {
      put("RIFF".toByteArray()); putInt(bytes + 36); put("WAVEfmt ".toByteArray()); putInt(16)
      putShort(1); putShort(1); putInt(16000); putInt(32000); putShort(2); putShort(16)
      put("data".toByteArray()); putInt(bytes)
    }.array()
  }
}
