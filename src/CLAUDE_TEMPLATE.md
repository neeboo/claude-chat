## 🚨 CRITICAL: Multi-Instance Collaboration Protocol v2.0 (Effective Immediately)

**⚠️ Every Claude instance must read this protocol first upon startup ⚠️**

### 📋 Message Classification System (Strict Enforcement)

1. **[STATUS]** - Progress Reports (No Reply Required)
   - Send status updates daily at 18:00
   - Main controller processes in batches, no individual replies

2. **[INFO]** - Information Sharing (No Reply Required)  
   - Technical discoveries, documentation updates
   - Other instances may choose to review

3. **[COORD] + [REPLY REQUIRED]** - Coordination Requests (Must Reply Within 48 Hours)
   - Must clearly specify recipient and deadline
   - Issues requiring cross-instance decisions

4. **[URGENT] + [REPLY REQUIRED]** - Critical Blocking Issues (Must Reply Within 2 Hours)
   - Problems affecting other instances' work
   - Immediate escalation required

**Prohibited Behaviors**:
<!-- 
- ❌ Excessive technical discussions
- ❌ Casual communication without message identifiers  
- ❌ Submitting untested code
- ❌ Ignoring user experience and aesthetics 
-->

### 📝 Startup Confirmation (Must Execute)

Send immediately after each startup:
```
[STATUS] [Instance Name] Startup Complete - MM-DD-YYYY HH:MM
- Protocol Version: v2.0 read and confirmed compliance
- Working Directory: [Confirm Directory]  
```

---

### Message Router & Communication

**Configuration:**
- Router can be configured via environment variables:
  - `CLAUDE_CHAT_HOST` (default: localhost)
  - `CLAUDE_CHAT_PORT` (default: configured port)
  - `CLAUDE_ROUTER_URL` (overrides host/port if specified)

**Router Endpoints:**
- **Health Check**: `GET http://localhost:<PORT>/health`
- **Instance Status**: `GET http://localhost:<PORT>/status`  
- **Send Message**: `POST http://localhost:<PORT>/message`
- **Register Instance**: `POST http://localhost:<PORT>/register`

**Inter-Instance Communication:**
Claude instances can send messages to coordinate work:
```bash
# Example: UI instance notifying Main about completion
curl -X POST http://localhost:<PORT>/message \
  -H "Content-Type: application/json" \
  -d '{"from": "ui", "to": "main", "content": "Component library finished"}'

# With custom port
curl -X POST http://localhost:4444/message \
  -H "Content-Type: application/json" \
  -d '{"from": "ui", "to": "main", "content": "Component library finished"}'
```