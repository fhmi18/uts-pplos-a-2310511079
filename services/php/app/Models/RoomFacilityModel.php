<?php

namespace App\Models;

use CodeIgniter\Model;

class RoomFacilityModel extends Model
{
    protected $table = 'room_facilities';
    protected $primaryKey = null;
    protected $useAutoIncrement = false;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $allowedFields = [
        'room_id',
        'facility_id',
    ];

    protected $useTimestamps = false;

    /**
     * Get all facilities for a room with details
     */
    public function getRoomFacilities($roomId)
    {
        return $this->select('rf.room_id, rf.facility_id, f.name, f.description, f.icon')
            ->from('room_facilities rf')
            ->join('facilities f', 'rf.facility_id = f.id', 'left')
            ->where('rf.room_id', $roomId)
            ->get()
            ->getResultArray();
    }

    /**
     * Check if facility exists for room
     */
    public function facilityExistsForRoom($roomId, $facilityId)
    {
        return $this->where('room_id', $roomId)
            ->where('facility_id', $facilityId)
            ->countAllResults() > 0;
    }

    /**
     * Add facility to room
     */
    public function addFacility($roomId, $facilityId)
    {
        // Check if already exists
        if ($this->facilityExistsForRoom($roomId, $facilityId)) {
            return false;
        }

        return $this->insert([
            'room_id' => $roomId,
            'facility_id' => $facilityId,
        ]);
    }

    /**
     * Remove facility from room
     */
    public function removeFacility($roomId, $facilityId)
    {
        return $this->where('room_id', $roomId)
            ->where('facility_id', $facilityId)
            ->delete();
    }

    /**
     * Remove all facilities from room
     */
    public function clearRoomFacilities($roomId)
    {
        return $this->where('room_id', $roomId)->delete();
    }
}
