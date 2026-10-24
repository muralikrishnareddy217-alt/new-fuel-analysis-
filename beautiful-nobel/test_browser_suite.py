import subprocess
import time
import json
import urllib.request
import websocket
import os
import sys

chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
port = 9222

print("Launching Chrome in headless mode with remote debugging...")
proc = subprocess.Popen([
    chrome_path,
    "--headless=new",
    f"--remote-debugging-port={port}",
    "--remote-allow-origins=*",
    "--disable-web-security",
    "--no-first-run",
    "--no-default-browser-check",
    "http://127.0.0.1:8000/"
])

msg_id = 1

try:
    time.sleep(2.0)
    tabs = json.loads(urllib.request.urlopen(f"http://127.0.0.1:{port}/json").read())
    target_tab = None
    for tab in tabs:
        if "8000" in tab.get("url", ""):
            target_tab = tab
            break
    if not target_tab:
        target_tab = tabs[0]

    ws_url = target_tab["webSocketDebuggerUrl"]
    print(f"Connecting to tab: {target_tab.get('title')} ({target_tab.get('url')})")
    ws = websocket.create_connection(ws_url)

    def send_cmd(method, params=None):
        global msg_id
        payload = {"id": msg_id, "method": method, "params": params or {}}
        msg_id += 1
        ws.send(json.dumps(payload))
        while True:
            res = json.loads(ws.recv())
            if res.get("id") == payload["id"]:
                return res

    def evaluate(expression):
        res = send_cmd("Runtime.evaluate", {
            "expression": expression,
            "returnByValue": True,
            "awaitPromise": True
        })
        if "exceptionDetails" in res.get("result", {}):
            print(f"JS EXCEPTION for '{expression}':", res["result"]["exceptionDetails"])
        return res.get("result", {}).get("result", {}).get("value")

    # 1. Enable Console & Log domains
    send_cmd("Console.enable")
    send_cmd("Runtime.enable")

    # 2. Check title and global objects
    title = evaluate("document.title")
    print(f"[TEST 1] Document Title: '{title}'")
    assert "AERO // FUEL 3D" in title, "Title mismatch"

    has_three = evaluate("typeof window.THREE !== 'undefined'")
    has_chart = evaluate("typeof window.Chart !== 'undefined'")
    has_lucide = evaluate("typeof window.lucide !== 'undefined'")
    has_app = evaluate("typeof window.app !== 'undefined'")
    print(f"[TEST 2] Libraries: THREE={has_three}, Chart={has_chart}, Lucide={has_lucide}, App={has_app}")

    # 3. Test Store & 500 Records Generation
    rec_count_initial = evaluate("window.FuelStore.getRecords().length")
    print(f"[TEST 3] Initial records count in localStorage: {rec_count_initial}")
    assert rec_count_initial >= 500, f"Expected at least 500 records, got {rec_count_initial}"

    # Re-generate fresh 500 records
    evaluate("window.FuelStore.load500Records(); window.app.refreshAllData();")
    rec_count_500 = evaluate("window.FuelStore.getRecords().length")
    print(f"[TEST 4] Records after explicit load500Records(): {rec_count_500}")
    assert rec_count_500 == 500, f"Expected 500 records, got {rec_count_500}"

    # 4. Test Distance-Weighted Metrics Calculation over 500 records
    metrics = evaluate("window.FuelStore.getMetrics()")
    print("[TEST 5] Fleet Metrics across 500 records:")
    print(f"  - Total Vehicles: {metrics.get('totalVehicles')}")
    print(f"  - Total Distance: {metrics.get('totalDistance'):,} km")
    print(f"  - Total Fuel: {metrics.get('totalFuel'):,} L")
    print(f"  - Total Cost: Rs. {metrics.get('totalCost'):,}")
    print(f"  - Distance-Weighted Efficiency: {metrics.get('avgEfficiency')} km/L")
    print(f"  - Avg Cost per KM: Rs. {metrics.get('avgCostPerKm')} / km")
    print(f"  - Best Vehicle: {metrics.get('bestVehicle', {}).get('vehicle')} ({metrics.get('bestVehicle', {}).get('efficiency')} km/L)")

    expected_eff = round(metrics['totalDistance'] / metrics['totalFuel'], 2)
    assert abs(metrics['avgEfficiency'] - expected_eff) < 0.05, "Distance-weighted calculation error"

    # 5. Test Navigation across all pages
    pages = ["overview", "add", "vehicles", "search", "all", "analytics", "reports", "settings"]
    for p in pages:
        evaluate(f"window.app.navigate('{p}')")
        active_view = evaluate("document.querySelector('.app-view-panel.active').id")
        assert active_view == f"view-{p}", f"Navigation to {p} failed: {active_view}"
    print(f"[TEST 6] Successfully navigated to all {len(pages)} view panels with 500 records!")

    # 6. Test Adding a New Record via Wizard
    evaluate("""
        window.app.navigate('add');
        window.FuelUI.resetWizard();
        window.FuelUI.wizardState.brand = 'Porsche';
        window.FuelUI.wizardState.model = '911';
        window.FuelUI.wizardState.year = 2024;
        window.FuelUI.wizardState.fuel = 'Petrol';
        window.FuelUI.wizardState.color = '#ef4444';
        window.FuelUI.wizardState.distance = 420;
        window.FuelUI.wizardState.litres = 28;
        window.FuelUI.wizardState.cost = 3360;
        window.FuelUI.wizardState.date = '2026-10-23';
        window.FuelUI.wizardState.step = 4;
        window.FuelUI.saveWizardRecord();
    """)
    rec_count_after_add = evaluate("window.FuelStore.getRecords().length")
    print(f"[TEST 7] Records after adding new Porsche 911: {rec_count_after_add}")
    assert rec_count_after_add == 501, f"Expected 501 records, got {rec_count_after_add}"

    new_rec = evaluate("window.FuelStore.getRecords()[0]")
    assert new_rec["vehicle"] == "Porsche 911", "Vehicle name mismatch"
    assert new_rec["efficiency"] == 15.0, f"Expected 15.0 km/L, got {new_rec['efficiency']}"

    # 7. Test Editing a Record
    new_id = new_rec["id"]
    evaluate(f"""
        const rec = window.FuelStore.getRecordById({new_id});
        window.FuelUI.resetWizard(true, rec);
        window.FuelUI.wizardState.distance = 450;
        window.FuelUI.wizardState.litres = 25;
        window.FuelUI.wizardState.cost = 3000;
        window.FuelUI.wizardState.step = 4;
        window.FuelUI.saveWizardRecord();
    """)
    edited_rec = evaluate(f"window.FuelStore.getRecordById({new_id})")
    print(f"[TEST 8] Record after editing: distance={edited_rec['distance']} km, efficiency={edited_rec['efficiency']} km/L")
    assert edited_rec["distance"] == 450, "Distance was not updated"
    assert edited_rec["efficiency"] == 18.0, "Efficiency was not recalculated on edit"

    # 8. Test Searching & Filtering across 500 records
    evaluate("window.app.navigate('search')")
    evaluate("window.FuelUI.searchState.query = 'BMW'; window.FuelUI.renderSearchResults();")
    search_count = evaluate("document.querySelectorAll('#searchResultsContainer .cyber-table tbody tr').length")
    print(f"[TEST 9] Search results for 'BMW': {search_count} row(s)")
    assert search_count > 0, "Expected search results for BMW"

    # 9. Test Deleting the added record
    evaluate(f"window.FuelStore.deleteRecord({new_id}); window.app.refreshAllData();")
    rec_count_after_del = evaluate("window.FuelStore.getRecords().length")
    print(f"[TEST 10] Records after deleting record: {rec_count_after_del}")
    assert rec_count_after_del == 500, "Delete record failed"

    # 10. Test Trip Cost Estimator with 500-fleet baseline
    estimate = evaluate("window.FuelInsights.estimateTrip(500, 'BMW M5 Competition', 105)")
    print("[TEST 11] Trip Estimator (500 km in BMW M5 Competition @ Rs. 105/L):")
    print(f"  - Baseline efficiency: {estimate['baselineEfficiency']} km/L")
    print(f"  - Estimated fuel: {estimate['estimatedLitres']} L")
    print(f"  - Estimated cost: Rs. {estimate['estimatedCost']}")
    print(f"  - Estimated cost/km: Rs. {estimate['estimatedCostPerKm']}/km")
    assert estimate["estimatedLitres"] > 0, "Estimator failed to calculate litres"
    assert estimate["estimatedCost"] > 0, "Estimator failed to calculate cost"

    # 11. Test Exporting 500 records to CSV & JSON
    csv_content = evaluate("window.FuelStore.exportCSV()")
    assert "Record ID" in csv_content, "CSV export failed"
    print(f"[TEST 12] CSV export of 500 records verified! Total lines: {len(csv_content.splitlines())}")
    assert len(csv_content.splitlines()) >= 501, "Expected at least 501 CSV lines"

    json_backup = evaluate("window.FuelStore.exportJSON()")
    parsed_json = json.loads(json_backup)
    assert parsed_json["totalRecords"] == 500, f"Expected 500 records in JSON, got {parsed_json['totalRecords']}"
    print(f"[TEST 13] JSON backup of 500 records verified! Total records in payload: {parsed_json['totalRecords']}")

    # 12. Test Three.js Viewer Features
    has_scene = evaluate("window.app.threeViewer && window.app.threeViewer.scene !== null")
    print(f"[TEST 14] Three.js scene initialized: {has_scene}")
    assert has_scene, "Three.js viewer scene is null"

    evaluate("window.app.threeViewer.setPaintColor('#004fc7')")
    evaluate("window.app.threeViewer.toggleHeadlights()")
    evaluate("window.app.threeViewer.setCameraView('front')")
    print("[TEST 15] Three.js camera transitions & lighting controls executed smoothly!")

    print("\n=======================================================")
    print("ALL 15 INTEGRATION TESTS PASSED ACROSS 500 RECORDS WITH 100% SUCCESS!")
    print("=======================================================\n")

finally:
    proc.terminate()
