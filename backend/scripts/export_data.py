"""
Export all data from the GMAO database as SQL INSERT statements.
Run from the backend/ directory: python scripts/export_data.py
"""
import asyncio
import json
from prisma import Prisma

def escape_sql(val):
    if val is None:
        return "NULL"
    if isinstance(val, str):
        return f"'{val.replace(chr(39), chr(39)*2)}'"
    return str(val)

async def main():
    db = Prisma()
    await db.connect()

    lines = []
    lines.append("-- GMAO Platform - Data Export")
    lines.append("-- Generated automatically. Import with: psql -U gmao_user -d gmao_db -f database/seed_data.sql")
    lines.append("-- Run AFTER: npx prisma db push (to create tables first)")
    lines.append("")

    # ─── Users ───────────────────────────────────────────────────────────────
    lines.append("-- ================================================================")
    lines.append("-- USERS")
    lines.append("-- ================================================================")
    lines.append('TRUNCATE TABLE "User" CASCADE;')
    users = await db.user.find_many()
    for u in users:
        lines.append(
            f'INSERT INTO "User" (id, username, email, password_hash, role, name, manager_id, team, face_descriptor) '
            f'VALUES ({u.id}, {escape_sql(u.username)}, {escape_sql(u.email)}, '
            f'{escape_sql(u.password_hash)}, {escape_sql(u.role)}, {escape_sql(u.name)}, '
            f'{escape_sql(u.manager_id)}, {escape_sql(u.team)}, {escape_sql(u.face_descriptor)});'
        )
    lines.append(f"-- {len(users)} users exported\n")

    # ─── Machines ────────────────────────────────────────────────────────────
    lines.append("-- ================================================================")
    lines.append("-- MACHINES")
    lines.append("-- ================================================================")
    lines.append('TRUNCATE TABLE "Machine" CASCADE;')
    machines = await db.machine.find_many()
    for m in machines:
        lines.append(
            f'INSERT INTO "Machine" (id, name, reference, location, status, health_score, last_maintenance_date, next_maintenance_date, maintenance_frequency_days) '
            f'VALUES ({m.id}, {escape_sql(m.name)}, {escape_sql(m.reference)}, {escape_sql(m.location)}, '
            f'{escape_sql(m.status)}, {escape_sql(m.health_score)}, {escape_sql(m.last_maintenance_date)}, '
            f'{escape_sql(m.next_maintenance_date)}, {escape_sql(m.maintenance_frequency_days)});'
        )
    lines.append(f"-- {len(machines)} machines exported\n")

    # ─── Stock / Pieces ──────────────────────────────────────────────────────
    lines.append("-- ================================================================")
    lines.append("-- STOCK (PIECES)")
    lines.append("-- ================================================================")
    lines.append('TRUNCATE TABLE "stock_items" CASCADE;')
    stock = await db.stock.find_many()
    for s in stock:
        lines.append(
            f'INSERT INTO "stock_items" (id, name, reference, quantity, unit, location, image, synonyms, unit_price) '
            f'VALUES ({s.id}, {escape_sql(s.name)}, {escape_sql(s.reference)}, {escape_sql(s.quantity)}, '
            f'{escape_sql(s.unit)}, {escape_sql(s.location)}, {escape_sql(s.image)}, {escape_sql(s.synonyms)}, {s.unit_price or 0.0});'
        )
    lines.append(f"-- {len(stock)} stock items exported\n")

    # ─── Work Orders ─────────────────────────────────────────────────────────
    lines.append("-- ================================================================")
    lines.append("-- WORK ORDERS")
    lines.append("-- ================================================================")
    lines.append('TRUNCATE TABLE "WorkOrder" CASCADE;')
    wos = await db.workorder.find_many()
    for w in wos:
        lines.append(
            f'INSERT INTO "WorkOrder" (id, sap_order_id, title, description, "type", priority, status, '
            f'technical_location, equipment_id, serial_number, team, responsible_person, technician_id, '
            f'planned_start_date, planned_end_date, actual_start_date, actual_end_date, time_spent, '
            f'work_log, failure_cause, solution_applied, comments, created_by, created_at) '
            f'VALUES ({w.id}, {escape_sql(w.sap_order_id)}, {escape_sql(w.title)}, {escape_sql(w.description)}, '
            f'{escape_sql(w.type)}, {escape_sql(w.priority)}, {escape_sql(w.status)}, {escape_sql(w.technical_location)}, '
            f'{escape_sql(w.equipment_id)}, {escape_sql(w.serial_number)}, {escape_sql(w.team)}, {escape_sql(w.responsible_person)}, '
            f'{escape_sql(w.technician_id)}, {escape_sql(w.planned_start_date)}, {escape_sql(w.planned_end_date)}, '
            f'{escape_sql(w.actual_start_date)}, {escape_sql(w.actual_end_date)}, {escape_sql(w.time_spent)}, '
            f'{escape_sql(w.work_log)}, {escape_sql(w.failure_cause)}, {escape_sql(w.solution_applied)}, '
            f'{escape_sql(w.comments)}, {escape_sql(w.created_by)}, {escape_sql(w.created_at)});'
        )
    lines.append(f"-- {len(wos)} work orders exported\n")

    # ─── Reset sequences ─────────────────────────────────────────────────────
    lines.append("-- ================================================================")
    lines.append("-- RESET SEQUENCES")
    lines.append("-- ================================================================")
    lines.append('SELECT setval(pg_get_serial_sequence(\'"User"\', \'id\'), COALESCE((SELECT MAX(id) FROM "User") + 1, 1), false);')
    lines.append('SELECT setval(pg_get_serial_sequence(\'"Machine"\', \'id\'), COALESCE((SELECT MAX(id) FROM "Machine") + 1, 1), false);')
    lines.append('SELECT setval(pg_get_serial_sequence(\'"stock_items"\', \'id\'), COALESCE((SELECT MAX(id) FROM "stock_items") + 1, 1), false);')
    lines.append('SELECT setval(pg_get_serial_sequence(\'"WorkOrder"\', \'id\'), COALESCE((SELECT MAX(id) FROM "WorkOrder") + 1, 1), false);')

    await db.disconnect()

    output = "\n".join(lines)
    with open("../database/seed_data.sql", "w", encoding="utf-8") as f:
        f.write(output)

    print(f"Export done: {len(users)} users, {len(machines)} machines, {len(stock)} pieces, {len(wos)} work orders")
    print("File saved: ../database/seed_data.sql")

if __name__ == "__main__":
    asyncio.run(main())
