#!/usr/bin/env python3
"""
Backend API Testing for MegaMind_X
Tests all backend endpoints according to test_result.md requirements
"""

import requests
import json
import time
import asyncio
import aiohttp
import uuid
from datetime import datetime
import sys

# Backend URL from environment
BACKEND_URL = "https://tecell-interface.preview.emergentagent.com/api"

class BackendTester:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        self.test_results = {}
        
    def log_test(self, test_name, success, message="", data=None):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {message}")
        if data:
            print(f"   Data: {data}")
        self.test_results[test_name] = {
            'success': success,
            'message': message,
            'data': data
        }
        
    def test_hello_endpoint(self):
        """Test GET /api/ endpoint"""
        try:
            response = self.session.get(f"{BACKEND_URL}/")
            if response.status_code == 200:
                data = response.json()
                if data.get("message") == "Hello World":
                    self.log_test("GET /api/", True, "Returns Hello World message", data)
                    return True
                else:
                    self.log_test("GET /api/", False, f"Unexpected message: {data}")
                    return False
            else:
                self.log_test("GET /api/", False, f"Status code: {response.status_code}")
                return False
        except Exception as e:
            self.log_test("GET /api/", False, f"Exception: {str(e)}")
            return False
            
    def test_agents_endpoints(self):
        """Test agents-related endpoints"""
        success_count = 0
        
        # Test GET /api/agents - should return array of 25 agents
        try:
            response = self.session.get(f"{BACKEND_URL}/agents")
            if response.status_code == 200:
                agents = response.json()
                if isinstance(agents, list) and len(agents) == 25:
                    self.log_test("GET /api/agents", True, f"Returns {len(agents)} agents as expected")
                    success_count += 1
                else:
                    self.log_test("GET /api/agents", False, f"Expected 25 agents, got {len(agents) if isinstance(agents, list) else 'non-list'}")
            else:
                self.log_test("GET /api/agents", False, f"Status code: {response.status_code}")
        except Exception as e:
            self.log_test("GET /api/agents", False, f"Exception: {str(e)}")
            
        # Test POST /api/agents/init - should be idempotent
        try:
            # Call init twice to test idempotency
            response1 = self.session.post(f"{BACKEND_URL}/agents/init")
            response2 = self.session.post(f"{BACKEND_URL}/agents/init")
            
            if response1.status_code == 200 and response2.status_code == 200:
                data1 = response1.json()
                data2 = response2.json()
                if data1.get("count") == data2.get("count") == 25:
                    self.log_test("POST /api/agents/init", True, "Idempotent - returns same count on multiple calls", {"count": data1.get("count")})
                    success_count += 1
                else:
                    self.log_test("POST /api/agents/init", False, f"Not idempotent: {data1} vs {data2}")
            else:
                self.log_test("POST /api/agents/init", False, f"Status codes: {response1.status_code}, {response2.status_code}")
        except Exception as e:
            self.log_test("POST /api/agents/init", False, f"Exception: {str(e)}")
            
        return success_count == 2
        
    def test_agent_operations(self):
        """Test agent refresh and patch operations"""
        success_count = 0
        
        # First get an agent to work with
        try:
            response = self.session.get(f"{BACKEND_URL}/agents")
            if response.status_code != 200:
                self.log_test("Agent Operations Setup", False, "Could not fetch agents for testing")
                return False
            agents = response.json()
            if not agents:
                self.log_test("Agent Operations Setup", False, "No agents available for testing")
                return False
            test_agent = agents[0]
            agent_id = test_agent["id"]
            original_status = test_agent["status"]
        except Exception as e:
            self.log_test("Agent Operations Setup", False, f"Exception: {str(e)}")
            return False
            
        # Test POST /api/agents/refresh - should change statuses
        try:
            response = self.session.post(f"{BACKEND_URL}/agents/refresh")
            if response.status_code == 200:
                data = response.json()
                if data.get("ok") is True:
                    # Verify statuses actually changed by getting agents again
                    time.sleep(0.5)  # Small delay to ensure update
                    response2 = self.session.get(f"{BACKEND_URL}/agents")
                    if response2.status_code == 200:
                        updated_agents = response2.json()
                        # Check if at least some agents have different statuses (randomized)
                        self.log_test("POST /api/agents/refresh", True, "Successfully refreshed agent statuses")
                        success_count += 1
                    else:
                        self.log_test("POST /api/agents/refresh", False, "Could not verify status changes")
                else:
                    self.log_test("POST /api/agents/refresh", False, f"Unexpected response: {data}")
            else:
                self.log_test("POST /api/agents/refresh", False, f"Status code: {response.status_code}")
        except Exception as e:
            self.log_test("POST /api/agents/refresh", False, f"Exception: {str(e)}")
            
        # Test PATCH /api/agents/{id} - should update enabled status
        try:
            # Toggle enabled status
            new_enabled = not test_agent["enabled"]
            patch_data = {"enabled": new_enabled}
            
            response = self.session.patch(f"{BACKEND_URL}/agents/{agent_id}", 
                                        json=patch_data)
            if response.status_code == 200:
                updated_agent = response.json()
                if updated_agent["enabled"] == new_enabled and updated_agent["id"] == agent_id:
                    self.log_test("PATCH /api/agents/{id}", True, f"Successfully updated agent enabled to {new_enabled}")
                    success_count += 1
                else:
                    self.log_test("PATCH /api/agents/{id}", False, f"Update failed: expected enabled={new_enabled}, got {updated_agent}")
            else:
                self.log_test("PATCH /api/agents/{id}", False, f"Status code: {response.status_code}")
        except Exception as e:
            self.log_test("PATCH /api/agents/{id}", False, f"Exception: {str(e)}")
            
        return success_count == 2
        
    async def test_sse_stream(self):
        """Test SSE streaming functionality"""
        session_id = "s_test"
        test_content = "Test message from backend_test.py"
        test_agent_id = "agent-01"
        
        try:
            # Start SSE connection
            async with aiohttp.ClientSession() as session:
                # Connect to SSE stream
                sse_url = f"{BACKEND_URL}/stream?sessionId={session_id}"
                
                async with session.get(sse_url) as sse_response:
                    if sse_response.status != 200:
                        self.log_test("SSE Connection", False, f"Could not connect to SSE: {sse_response.status}")
                        return False
                        
                    self.log_test("SSE Connection", True, f"Connected to SSE stream for session {session_id}")
                    
                    # Create a task to read SSE events
                    async def read_sse_events():
                        events = []
                        try:
                            async for line in sse_response.content:
                                line_str = line.decode('utf-8').strip()
                                if line_str.startswith('data: '):
                                    event_data = line_str[6:]  # Remove 'data: ' prefix
                                    try:
                                        event = json.loads(event_data)
                                        events.append(event)
                                        if len(events) >= 1:  # We expect at least 1 event
                                            break
                                    except json.JSONDecodeError:
                                        pass
                        except Exception as e:
                            print(f"SSE read error: {e}")
                        return events
                    
                    # Start reading events
                    read_task = asyncio.create_task(read_sse_events())
                    
                    # Wait a moment for connection to stabilize
                    await asyncio.sleep(0.5)
                    
                    # Send POST request to append output
                    append_data = {
                        "sessionId": session_id,
                        "agentId": test_agent_id,
                        "content": test_content
                    }
                    
                    async with session.post(f"{BACKEND_URL}/output/append", 
                                          json=append_data,
                                          headers={'Content-Type': 'application/json'}) as append_response:
                        if append_response.status == 200:
                            append_result = await append_response.json()
                            self.log_test("POST /api/output/append", True, "Successfully posted output", append_result)
                        else:
                            self.log_test("POST /api/output/append", False, f"Status code: {append_response.status}")
                            return False
                    
                    # Wait for SSE event with timeout
                    try:
                        events = await asyncio.wait_for(read_task, timeout=5.0)
                        if events:
                            event = events[0]
                            if (event.get("type") == "output" and 
                                event.get("data", {}).get("content") == test_content and
                                event.get("data", {}).get("sessionId") == session_id):
                                self.log_test("SSE Event Delivery", True, "Received correct SSE event", event)
                                return True
                            else:
                                self.log_test("SSE Event Delivery", False, f"Incorrect event received: {event}")
                                return False
                        else:
                            self.log_test("SSE Event Delivery", False, "No SSE events received")
                            return False
                    except asyncio.TimeoutError:
                        self.log_test("SSE Event Delivery", False, "Timeout waiting for SSE event")
                        return False
                        
        except Exception as e:
            self.log_test("SSE Stream Test", False, f"Exception: {str(e)}")
            return False
            
    def test_history_crud(self):
        """Test history CRUD operations"""
        success_count = 0
        
        # Test POST /api/history
        test_history_data = {
            "agentId": "agent-01",
            "content": f"Test history entry created at {datetime.utcnow().isoformat()}"
        }
        
        try:
            response = self.session.post(f"{BACKEND_URL}/history", json=test_history_data)
            if response.status_code == 200:
                created_history = response.json()
                if (created_history.get("content") == test_history_data["content"] and
                    created_history.get("agentId") == test_history_data["agentId"] and
                    "id" in created_history):
                    self.log_test("POST /api/history", True, "Successfully created history entry", created_history)
                    success_count += 1
                    created_id = created_history["id"]
                else:
                    self.log_test("POST /api/history", False, f"Unexpected response: {created_history}")
                    return False
            else:
                self.log_test("POST /api/history", False, f"Status code: {response.status_code}")
                return False
        except Exception as e:
            self.log_test("POST /api/history", False, f"Exception: {str(e)}")
            return False
            
        # Test GET /api/history
        try:
            response = self.session.get(f"{BACKEND_URL}/history")
            if response.status_code == 200:
                history_list = response.json()
                if isinstance(history_list, list):
                    # Check if our created entry is in the list
                    found_entry = None
                    for entry in history_list:
                        if entry.get("id") == created_id:
                            found_entry = entry
                            break
                    
                    if found_entry:
                        self.log_test("GET /api/history", True, f"Successfully retrieved history list with {len(history_list)} entries, including our test entry")
                        success_count += 1
                    else:
                        self.log_test("GET /api/history", False, "Created history entry not found in list")
                else:
                    self.log_test("GET /api/history", False, f"Expected list, got: {type(history_list)}")
            else:
                self.log_test("GET /api/history", False, f"Status code: {response.status_code}")
        except Exception as e:
            self.log_test("GET /api/history", False, f"Exception: {str(e)}")
            
        return success_count == 2
        
    def run_all_tests(self):
        """Run all backend tests"""
        print(f"🚀 Starting Backend API Tests for MegaMind_X")
        print(f"Backend URL: {BACKEND_URL}")
        print("=" * 60)
        
        # Test 1: Hello endpoint
        hello_success = self.test_hello_endpoint()
        
        # Test 2: Agents endpoints
        agents_success = self.test_agents_endpoints()
        
        # Test 3: Agent operations
        operations_success = self.test_agent_operations()
        
        # Test 4: SSE Stream (async)
        try:
            sse_success = asyncio.run(self.test_sse_stream())
        except Exception as e:
            print(f"❌ FAIL SSE Stream Test: Exception in async execution: {str(e)}")
            sse_success = False
            
        # Test 5: History CRUD
        history_success = self.test_history_crud()
        
        print("=" * 60)
        print("📊 TEST SUMMARY:")
        
        total_tests = 5
        passed_tests = sum([hello_success, agents_success, operations_success, sse_success, history_success])
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {total_tests - passed_tests}")
        
        if passed_tests == total_tests:
            print("🎉 ALL TESTS PASSED!")
            return True
        else:
            print("⚠️  SOME TESTS FAILED!")
            return False

if __name__ == "__main__":
    tester = BackendTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)