package com.example.demo.controller;

import com.example.demo.model.StudyRoom;
import com.example.demo.repository.StudyRoomRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/rooms")
@CrossOrigin("*")
public class StudyRoomController {

    @Autowired
    private StudyRoomRepository roomRepository;

    @PostMapping
    public ResponseEntity<StudyRoom> createRoom(@RequestBody StudyRoom room) {
        return ResponseEntity.ok(roomRepository.save(room));
    }

    @GetMapping
    public ResponseEntity<List<StudyRoom>> getAllRooms() {
        return ResponseEntity.ok(roomRepository.findAll());
    }
}
