<?php

namespace App\Models;

use CodeIgniter\Model;

class RoomFacilityModel extends Model
{
    protected $table = 'room_facilities';
    protected $primaryKey = 'room_id';

    protected $useAutoIncrement = false;
    protected $returnType = 'array';
    protected $allowedFields = ['room_id', 'facility_id'];

    public function getRoomFacilities($roomId)
    {
        return $this->select('room_facilities.room_id, room_facilities.facility_id, f.name, f.description, f.icon')
            ->join('facilities f', 'room_facilities.facility_id = f.id', 'left')
            ->where('room_facilities.room_id', $roomId)
            ->findAll();
    }


    public function addFacility($roomId, $facilityId)
    {
        $exists = $this->where('room_id', $roomId)
            ->where('facility_id', $facilityId)
            ->first();

        if ($exists) {
            return false;
        }

        return $this->insert([
            'room_id' => $roomId,
            'facility_id' => $facilityId,
        ]);
    }
}