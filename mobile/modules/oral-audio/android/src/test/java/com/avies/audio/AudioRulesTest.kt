package com.avies.audio

import org.junit.Assert.*
import org.junit.Test
import java.nio.ByteBuffer
import java.nio.ByteOrder

class AudioRulesTest {
  @Test fun wavMatchesBackendPcmContract() {
    val h = AudioRules.wavHeader(3200)
    assertEquals("RIFF", String(h, 0, 4)); assertEquals("WAVE", String(h, 8, 4))
    val b = ByteBuffer.wrap(h).order(ByteOrder.LITTLE_ENDIAN)
    assertEquals(16000, b.getInt(24)); assertEquals(32000, b.getInt(28)); assertEquals(3200, b.getInt(40))
    assertEquals(1, b.getShort(22).toInt()); assertEquals(16, b.getShort(34).toInt())
  }
  @Test fun cleartextOnlyPrivateDemoHost() {
    assertEquals("http://192.168.1.4:8080", AudioRules.base("http://192.168.1.4:8080/"))
    assertEquals("https://api.avies.example", AudioRules.base("https://api.avies.example"))
    listOf("http://example.com", "http://192.168.1.1.evil.example", "http://256.1.2.3", "https://user:pass@example.com", "https://example.com?token=x").forEach {
      assertThrows(Exception::class.java) { AudioRules.base(it) }
    }
  }
  @Test fun invalidPcmCannotBePersisted() {
    assertThrows(IllegalArgumentException::class.java) { AudioRules.wavHeader(3) }
    assertThrows(IllegalArgumentException::class.java) { AudioRules.wavHeader(AudioRules.MAX_BYTES) }
  }
}
