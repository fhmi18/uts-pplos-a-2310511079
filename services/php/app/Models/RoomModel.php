<?php

namespace App\Models;

use CodeIgniter\Model;

class RoomModel extends Model
{
    protected $table = 'rooms';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $allowedFields = [
        'property_id',
        'room_number',
        'price_per_month',
        'description',
        'status',
        'capacity',
        'created_at',
        'updated_at',
    ];

    protected $useTimestamps = false;

    public function getRoomsByProperty($propertyId, array $filters = []): array
    {
        $limit = isset($filters['limit']) ? (int) $filters['limit'] : 10;
        $offset = isset($filters['offset']) ? (int) $filters['offset'] : 0;

        $builder = $this->builder();
        $builder->where('property_id', (int) $propertyId);

        if (!empty($filters['status'])) {
            $builder->where('status', $filters['status']);
        }

        $total = $builder->countAllResults(false);

        $data = $builder
            ->orderBy('room_number', 'ASC')
            ->limit($limit, $offset)
            ->get()
            ->getResultArray();

        return [
            'data' => $data,
            'total' => $total,
            'limit' => $limit,
            'offset' => $offset,
        ];
    }

    public function getRoomByIdAndProperty($roomId, $propertyId)
    {
        return $this->where('id', $roomId)
            ->where('property_id', $propertyId)
            ->first();
    }

    /**
     * Get room with all associated facilities
     */
    public function getRoomWithFacilities($roomId, $propertyId)
    {
        $room = $this->getRoomByIdAndProperty($roomId, $propertyId);

        if (!$room) {
            return null;
        }

        // Get associated facilities
        $db = \Config\Database::connect();
        $facilities = $db->table('room_facilities rf')
            ->select('rf.room_id, rf.facility_id, f.name, f.description, f.icon')
            ->join('facilities f', 'rf.facility_id = f.id', 'left')
            ->where('rf.room_id', $roomId)
            ->get()
            ->getResultArray();

        $room['facilities'] = $facilities;
        return $room;
    }
}

