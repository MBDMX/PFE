'use client';
import { useMachinesList } from './_components/useMachinesList';
import MachinesHeader from './_components/MachinesHeader';
import MachinesFilters from './_components/MachinesFilters';
import MachinesTable from './_components/MachinesTable';
import MachineSidePanel from './_components/MachineSidePanel';

export default function MachinesPage() {
    const {
        sortedMachines, loading, selectedMachine, machineOrders, loadingOrders,
        triggeringMaintenance, isSyncing, sortConfig, searchTerm, statusFilter,
        setSearchTerm, setStatusFilter, setSelectedMachine,
        handleSyncSAP, handleSelectMachine, handleTriggerMaintenance, handleSort,
    } = useMachinesList();

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <MachinesHeader isSyncing={isSyncing} onSync={handleSyncSAP} />

            <MachinesFilters
                searchTerm={searchTerm}
                statusFilter={statusFilter}
                onSearch={setSearchTerm}
                onFilter={setStatusFilter}
            />

            <MachinesTable
                machines={sortedMachines}
                loading={loading}
                sortConfig={sortConfig}
                onSort={handleSort}
                onSelect={handleSelectMachine}
            />

            {selectedMachine && (
                <MachineSidePanel
                    machine={selectedMachine}
                    machineOrders={machineOrders}
                    loadingOrders={loadingOrders}
                    triggeringMaintenance={triggeringMaintenance}
                    onClose={() => setSelectedMachine(null)}
                    onTriggerMaintenance={handleTriggerMaintenance}
                />
            )}
        </div>
    );
}
