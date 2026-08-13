package com.shopspot.controller;

import com.shopspot.dto.AuthResponse;
import com.shopspot.dto.LoginRequest;
import com.shopspot.dto.RegisterRequest;
import com.shopspot.model.Role;
import com.shopspot.model.Shop;
import com.shopspot.model.User;
import com.shopspot.repository.ShopRepository;
import com.shopspot.repository.UserRepository;
import com.shopspot.security.JwtUtil;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserRepository userRepository;
    private final ShopRepository shopRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public AuthController(UserRepository userRepository, ShopRepository shopRepository,
                           PasswordEncoder passwordEncoder, JwtUtil jwtUtil) {
        this.userRepository = userRepository;
        this.shopRepository = shopRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest req) {
        if (userRepository.existsByEmail(req.getEmail())) {
            return ResponseEntity.badRequest().body("An account with this email already exists.");
        }
        if (req.getRole() == null ||
            !(req.getRole().equalsIgnoreCase("SELLER") || req.getRole().equalsIgnoreCase("CONSUMER"))) {
            return ResponseEntity.badRequest().body("Role must be SELLER or CONSUMER.");
        }

        User user = new User();
        user.setName(req.getName());
        user.setEmail(req.getEmail());
        user.setPassword(passwordEncoder.encode(req.getPassword()));
        user.setPhone(req.getPhone());
        user.setRole(Role.valueOf(req.getRole().toUpperCase()));
        user = userRepository.save(user);

        // If registering as a seller, create their shop record right away
        if (user.getRole() == Role.SELLER) {
            Shop shop = new Shop();
            shop.setOwner(user);
            shop.setName(req.getShopName() != null ? req.getShopName() : req.getName() + "'s Shop");
            shop.setCategory(req.getShopCategory());
            shop.setAddressLine1(req.getAddressLine1());
            shop.setAreaLocality(req.getAreaLocality());
            shop.setCity(req.getCity());
            shop.setState(req.getState());
            shop.setPinCode(req.getPinCode());
            shop.setAddress(buildFlatAddress(req));
            shop.setLatitude(req.getLatitude());
            shop.setLongitude(req.getLongitude());
            shop.setPhone(req.getPhone());
            shop.setIsOpenNow(true);
            shopRepository.save(shop);
        }

        String token = jwtUtil.generateToken(user.getEmail(), user.getRole().name(), user.getId());
        return ResponseEntity.ok(new AuthResponse(token, user.getId(), user.getName(), user.getEmail(), user.getRole().name()));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest req) {
        User user = userRepository.findByEmail(req.getEmail()).orElse(null);
        if (user == null || !passwordEncoder.matches(req.getPassword(), user.getPassword())) {
            return ResponseEntity.status(401).body("Invalid email or password.");
        }
        String token = jwtUtil.generateToken(user.getEmail(), user.getRole().name(), user.getId());
        return ResponseEntity.ok(new AuthResponse(token, user.getId(), user.getName(), user.getEmail(), user.getRole().name()));
    }

    private String buildFlatAddress(RegisterRequest req) {
        StringBuilder sb = new StringBuilder();
        for (String part : new String[]{req.getAddressLine1(), req.getAreaLocality(), req.getCity(), req.getState(), req.getPinCode()}) {
            if (part != null && !part.isBlank()) {
                if (sb.length() > 0) sb.append(", ");
                sb.append(part.trim());
            }
        }
        return sb.toString();
    }
}
