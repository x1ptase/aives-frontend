package com.avies.audio

import android.Manifest
import android.content.pm.PackageManager
import android.content.Context
import android.media.*
import android.util.Base64
import android.util.AtomicFile
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.exception.CodedException
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.RequestBody.Companion.asRequestBody
import okio.ByteString.Companion.toByteString
import org.json.JSONObject
import java.io.File
import java.io.RandomAccessFile
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicReference

/** Android-only audio adapter. No Azure/Gemini keys, transcripts or business decisions originate here. */
class OralAudioModule : Module() {
  private val http = OkHttpClient.Builder().connectTimeout(10, TimeUnit.SECONDS).readTimeout(50, TimeUnit.SECONDS)
    .callTimeout(120, TimeUnit.SECONDS).followRedirects(false).followSslRedirects(false).build()
  private val streaming = http.newBuilder().readTimeout(0, TimeUnit.SECONDS).callTimeout(0, TimeUnit.SECONDS).build()
  private val connection = AtomicReference<Capture?>()
  private val playback = AtomicReference<Playback?>()
  private val io = Executors.newSingleThreadExecutor()
  private val focusListener = AudioManager.OnAudioFocusChangeListener { change -> if (change < 0) interrupt() }
  @Suppress("DEPRECATION") private fun takeFocus() {
    val manager = appContext.reactContext?.getSystemService(Context.AUDIO_SERVICE) as? AudioManager ?: safe(9005)
    if (manager.requestAudioFocus(focusListener, AudioManager.STREAM_MUSIC, AudioManager.AUDIOFOCUS_GAIN_TRANSIENT) != AudioManager.AUDIOFOCUS_REQUEST_GRANTED) safe(9005)
  }
  @Suppress("DEPRECATION") private fun releaseFocus() {
    (appContext.reactContext?.getSystemService(Context.AUDIO_SERVICE) as? AudioManager)?.abandonAudioFocus(focusListener)
  }

  override fun definition() = ModuleDefinition {
    Name("OralAudio")
    Events("audioEvent")
    AsyncFunction("connect") { operation: String, base: String, token: String, id: Double, request: String, scope: String, command: String ->
      requireId(id); checkScope(scope)
      if (playback.get() != null) safe(9005)
      val context = appContext.reactContext ?: safe(9005)
      if (context.checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) safe(9004)
      if (draft(scope) != null) safe(9006)
      val capture = Capture(operation, AudioRules.base(base), token, id.toLong(), JSONObject(request), scope, JSONObject(command))
      if (!connection.compareAndSet(null, capture)) safe(1812)
      try { capture.open() } catch (_: Exception) { capture.stop(); connection.compareAndSet(capture, null); safe(9005) }
    }
    AsyncFunction("finish") { operation: String, command: String ->
      val c = connection.get()?.takeIf { it.operation == operation } ?: safe(1811)
      c.finish(JSONObject(command))
    }
    AsyncFunction("disconnect") { operation: String ->
      connection.get()?.takeIf { it.operation == operation }?.let { it.stop(); connection.compareAndSet(it, null) }
    }
    AsyncFunction("readDraft") { scope: String -> draft(scope)?.toString() }
    AsyncFunction("deleteDraft") { scope: String ->
      checkScope(scope)
      if (connection.get()?.let { it.scope == scope && !it.submitted() } == true) safe(9006)
      File(directory(scope), "answer.wav").delete(); File(directory(scope), "draft.json").delete()
    }
    AsyncFunction("reserveDraft") { scope: String, command: String ->
      val saved = draft(scope) ?: safe(1813)
      val old = saved.getJSONObject("command"); val next = JSONObject(command)
      if (old.getString("turnId") != next.getString("turnId") || old.getString("clientSessionId") != next.getString("clientSessionId") || next.getString("action") != "SUBMIT") safe(1813)
      save(scope, next, true)
    }
    AsyncFunction("uploadDraft") { base: String, token: String, id: Double, submission: String, metadata: String, scope: String ->
      requireId(id); java.util.UUID.fromString(submission); checkScope(scope)
      val saved = draft(scope) ?: safe(1813)
      val body = JSONObject(metadata)
      val command = saved.getJSONObject("command")
      if (command.getString("turnId") != body.getString("turnId") || command.getString("clientSessionId") != body.getString("clientSessionId")) safe(1813)
      val wav = File(directory(scope), "answer.wav")
      if (wav.length() !in 128..AudioRules.MAX_BYTES.toLong()) safe(1813)
      val form = MultipartBody.Builder().setType(MultipartBody.FORM)
        .addFormDataPart("metadata", "metadata.json", metadata.toRequestBody("application/json".toMediaType()))
        .addFormDataPart("audio", "answer.wav", wav.asRequestBody("audio/wav".toMediaType())).build()
      val req = Request.Builder().url("${AudioRules.base(base)}/student-exams/${id.toLong()}/oral-examination/submissions/$submission/audio")
        .header("Authorization", "Bearer $token").post(form).build()
      try { http.newCall(req).execute().use { response ->
        if (!response.isSuccessful) safe(httpCode(response))
        limitedBody(response, 2 * 1024 * 1024)
      } } catch (e: CodedException) { throw e } catch (_: Exception) { safe(9001) }
    }
    AsyncFunction("speak") { operation: String, base: String, token: String, id: Double, request: String ->
      requireId(id)
      if (connection.get() != null) safe(9005)
      val player = Playback(operation)
      if (!playback.compareAndSet(null, player)) safe(9005)
      try { player.play(AudioRules.base(base), token, id.toLong(), request) }
      finally { player.stop(); playback.compareAndSet(player, null) }
    }
    Function("stopSpeech") { playback.get()?.stop() }
    OnActivityEntersBackground { interrupt() }
    OnDestroy { interrupt(); io.shutdown(); http.dispatcher.executorService.shutdown(); streaming.dispatcher.executorService.shutdown() }
  }
  private fun requireId(id: Double) { require(id > 0 && id <= 9007199254740991.0 && id % 1.0 == 0.0) }
  private fun checkScope(scope: String) { require(scope.matches(Regex("[a-f0-9]{64}"))) }
  private fun directory(scope: String): File {
    checkScope(scope)
    return File(appContext.reactContext?.filesDir ?: safe(9005), "oral-drafts/$scope").apply { mkdirs() }
  }
  private fun draft(scope: String): JSONObject? {
    val dir = directory(scope); val meta = File(dir, "draft.json"); val wav = File(dir, "answer.wav")
    if ((!meta.exists() && !File(dir, "draft.json.bak").exists()) || !wav.exists()) return null
    if (meta.length() > 8000 || wav.length() > AudioRules.MAX_BYTES) safe(1813)
    // A killed process may leave the initial zero-length header. Keep its captured PCM recoverable.
    if (connection.get()?.scope != scope && wav.length() >= 44 && wav.length() % 2 == 0L) {
      RandomAccessFile(wav, "rw").use { it.seek(0); it.write(AudioRules.wavHeader((it.length() - 44).toInt())); it.fd.sync() }
    }
    return JSONObject(AtomicFile(meta).openRead().bufferedReader().use { it.readText() }).put("bytes", wav.length())
  }
  private fun save(scope: String, command: JSONObject, sent: Boolean) {
    val atomic = AtomicFile(File(directory(scope), "draft.json")); val out = atomic.startWrite()
    try { out.write(JSONObject().put("command", command).put("sent", sent).toString().toByteArray()); atomic.finishWrite(out) }
    catch (failure: Exception) { atomic.failWrite(out); throw failure }
  }
  private fun event(operation: String, kind: String, payload: String = "", code: Int = 0) =
    sendEvent("audioEvent", mapOf("operation" to operation, "kind" to kind, "payload" to payload, "code" to code))
  private fun interrupt() {
    playback.get()?.stop()
    connection.get()?.let { c -> io.execute { c.stop(); connection.compareAndSet(c, null); event(c.operation, "interrupted", code = 9005) } }
  }
  private fun safe(code: Int): Nothing = throw CodedException("Audio operation failed ($code)")
  private fun httpCode(response: Response): Int {
    if (response.code == 401) return 1003
    if (response.code == 403) return 1004
    return try { JSONObject(limitedBody(response, 16000)).optInt("code", 9005) } catch (_: Exception) { 9005 }
  }
  private fun limitedBody(response: Response, max: Int): String {
    val source = response.body?.source() ?: safe(9002)
    if (source.request((max + 1).toLong())) safe(9002)
    return source.readUtf8()
  }

  private inner class Capture(val operation: String, val base: String, private var token: String, val id: Long,
    val request: JSONObject, val scope: String, var command: JSONObject) {
    @Volatile private var socket: WebSocket? = null
    @Volatile private var recorder: AudioRecord? = null
    @Volatile private var thread: Thread? = null
    private val running = AtomicBoolean(false)
    private val closed = AtomicBoolean(false)
    private val finishing = AtomicBoolean(false)
    @Volatile private var file: RandomAccessFile? = null
    private var bytes = 0
    fun open() {
      val uri = base.replaceFirst("https://", "wss://").replaceFirst("http://", "ws://")
      socket = streaming.newWebSocket(Request.Builder().url("$uri/student-exams/$id/oral-examination/stream").build(), object : WebSocketListener() {
        override fun onOpen(webSocket: WebSocket, response: Response) {
          if (closed.get()) { webSocket.cancel(); return }
          webSocket.send(JSONObject().put("type", "AUTH").put("token", token).toString()); token = ""
        }
        override fun onMessage(webSocket: WebSocket, text: String) {
          if (closed.get()) return
          try {
            if (text.length > 256000) safe(1811)
            val msg = JSONObject(text)
            when (msg.getString("type")) {
              "AUTHENTICATED" -> webSocket.send(JSONObject().put("type", "START").put("request", request).toString())
              "READY" -> {
                if (msg.getInt("sampleRate") != 16000) safe(1811)
                startMic(); event(operation, "ready")
              }
              "PARTIAL", "FINAL", "PROGRESS", "RESULT" -> event(operation, "socket", text)
              "ERROR" -> fail(msg.optInt("code", 1811))
              else -> fail(1811)
            }
          } catch (_: Exception) { fail(1811) }
        }
        override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) { fail(1811) }
        override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
          if (!closed.get()) { event(operation, "closed"); io.execute { stop(); connection.compareAndSet(this@Capture, null) } }
        }
      })
    }
    @Synchronized private fun startMic() {
      if (closed.get() || running.get() || file != null) safe(1811)
      takeFocus()
      val size = AudioRecord.getMinBufferSize(16000, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT)
      if (size < 1) safe(9005)
      val mic = AudioRecord(MediaRecorder.AudioSource.VOICE_RECOGNITION, 16000, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT, maxOf(size * 2, 6400))
      if (mic.state != AudioRecord.STATE_INITIALIZED) { mic.release(); safe(9005) }
      recorder = mic
      file = RandomAccessFile(File(directory(scope), "answer.wav"), "rw").apply { setLength(0); write(AudioRules.wavHeader(0)) }
      save(scope, command, false)
      running.set(true); mic.startRecording()
      thread = Thread({
        val frame = ByteArray(AudioRules.FRAME_BYTES)
        try {
          while (running.get() && !closed.get()) {
            val n = mic.read(frame, 0, frame.size, AudioRecord.READ_BLOCKING)
            if (n <= 0) { if (running.get() && !closed.get()) fail(9005); break }
            if (n % 2 != 0) { fail(9005); break }
            file?.write(frame, 0, n); bytes += n
            // Flush the read already in progress before FINISH, including the final partial frame.
            if (!closed.get() && ((socket?.queueSize() ?: Long.MAX_VALUE) > 128 * 1024 || socket?.send(frame.copyOf(n).toByteString()) != true)) { fail(1811); break }
            if (bytes >= 16000 * 2 * 250) { running.set(false); event(operation, "limit"); break }
          }
        } catch (_: Exception) { if (running.get()) fail(9005) }
      }, "avies-microphone").also { it.start() }
    }
    @Synchronized private fun stopMic() {
      running.set(false)
      try { recorder?.stop() } catch (_: Exception) { }
      if (Thread.currentThread() != thread) thread?.join(2500)
      if (thread?.isAlive == true && Thread.currentThread() != thread) safe(9005)
      recorder?.release(); recorder = null
      file?.apply { seek(0); write(AudioRules.wavHeader(bytes)); fd.sync(); close() }; file = null
      releaseFocus()
    }
    fun finish(nextCommand: JSONObject) {
      if (!finishing.compareAndSet(false, true)) safe(1811)
      if (nextCommand.getString("turnId") != request.getString("turnId") || nextCommand.getString("clientSessionId") != request.getString("clientSessionId") || nextCommand.getString("action") != "SUBMIT") safe(1813)
      stopMic(); command = nextCommand
      if (bytes < 128) { save(scope, command, false); safe(1813) }
      save(scope, command, true) // Persist the exact receipt before any uncertain network write.
      if (socket?.send(JSONObject().put("type", "FINISH").put("command", command).toString()) != true) safe(1811)
    }
    fun submitted(): Boolean = finishing.get() && !running.get() && file == null
    fun stop() {
      if (!closed.compareAndSet(false, true)) return
      token = ""; try { stopMic() } finally { socket?.cancel(); socket = null }
    }
    private fun fail(code: Int) {
      if (closed.get()) return
      event(operation, "error", code = code)
      io.execute { stop(); connection.compareAndSet(this, null) }
    }
  }

  private inner class Playback(val operation: String) {
    private val cancelled = AtomicBoolean(false)
    @Volatile private var call: Call? = null
    @Volatile private var track: AudioTrack? = null
    fun stop() {
      cancelled.set(true); call?.cancel()
      try { track?.pause(); track?.flush() } catch (_: Exception) { }
    }
    fun play(base: String, token: String, id: Long, body: String) {
      val audio = AudioTrack.Builder().setAudioAttributes(AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA).setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build())
        .setAudioFormat(AudioFormat.Builder().setSampleRate(24000).setChannelMask(AudioFormat.CHANNEL_OUT_MONO).setEncoding(AudioFormat.ENCODING_PCM_16BIT).build())
        .setTransferMode(AudioTrack.MODE_STREAM).setBufferSizeInBytes(maxOf(16384, AudioTrack.getMinBufferSize(24000, AudioFormat.CHANNEL_OUT_MONO, AudioFormat.ENCODING_PCM_16BIT))).build()
      track = audio
      try {
        takeFocus()
        audio.play()
        val req = Request.Builder().url("$base/student-exams/$id/oral-examination/speech-stream").header("Authorization", "Bearer $token")
          .header("Accept", "application/x-ndjson").post(body.toRequestBody("application/json".toMediaType())).build()
        val request = http.newCall(req); call = request
        var total = 0; var ended = false
        request.execute().use { response ->
          if (!response.isSuccessful) safe(httpCode(response))
          if (response.body?.contentType()?.toString()?.substringBefore(';') != "application/x-ndjson") safe(1808)
          val source = response.body!!.source()
          while (!cancelled.get() && !source.exhausted()) {
            val line = source.readUtf8LineStrict(16000)
            if (ended) safe(1808)
            val frame = JSONObject(line)
            when (frame.optString("type")) {
              "audio" -> {
                val raw = frame.getString("data"); if (raw.length > 12000) safe(1808)
                val pcm = Base64.decode(raw, Base64.NO_WRAP)
                if (pcm.isEmpty() || pcm.size % 2 != 0 || total + pcm.size > AudioRules.MAX_BYTES) safe(1808)
                if (total == 0) event(operation, "playing")
                total += pcm.size
                var offset = 0
                while (offset < pcm.size && !cancelled.get()) {
                  val written = audio.write(pcm, offset, pcm.size - offset, AudioTrack.WRITE_BLOCKING)
                  if (written <= 0) safe(9005)
                  offset += written
                }
              }
              "end" -> { if (total == 0) safe(1808); ended = true }
              "error" -> safe(frame.optInt("code", 1808))
              else -> safe(1808)
            }
          }
        }
        if (!ended || cancelled.get()) safe(9005)
        val drainUntil = System.nanoTime() + TimeUnit.SECONDS.toNanos(8)
        while ((audio.playbackHeadPosition.toLong() and 0xffffffffL) < total / 2 && !cancelled.get()) {
          if (System.nanoTime() > drainUntil) safe(9005)
          Thread.sleep(15)
        }
        if (cancelled.get()) safe(9005)
      } catch (e: CodedException) { throw e } catch (_: Exception) { safe(9005) }
      finally { track = null; audio.release(); call = null; releaseFocus() }
    }
  }
}
