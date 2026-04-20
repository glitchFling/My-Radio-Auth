// hash.cpp
#include <cstdint>
#include <cstddef>

static uint32_t heap_ptr = 1024;
static uint32_t last_len = 0;

// Simple bump allocator: matches your WAT alloc
extern "C" uint32_t alloc(uint32_t len) {
    uint32_t old = heap_ptr;
    heap_ptr += len;
    return old;
}

extern "C" uint32_t get_last_len() {
    return last_len;
}

// FNV-1a 64-bit constants
static constexpr uint64_t FNV_OFFSET_BASIS = 1469598103934665603ull;
static constexpr uint64_t FNV_PRIME        = 1099511628211ull;

extern "C" uint32_t hash_str(uint32_t ptr, uint32_t len) {
    // In wasm32 linear memory, pointers are just 32-bit offsets
    uint8_t* base = reinterpret_cast<uint8_t*>(uintptr_t(0));
    uint8_t* in   = base + ptr;

    uint64_t h = FNV_OFFSET_BASIS;

    // BYTE LOOP
    for (uint32_t i = 0; i < len; ++i) {
        uint8_t byte = in[i];
        h ^= static_cast<uint64_t>(byte);
        h *= FNV_PRIME;
    }

    // HEX ENCODING: 16 chars + null
    uint32_t out_ptr = alloc(17);
    uint8_t* out = base + out_ptr;

    last_len = 16;

    for (uint32_t i = 0; i < 16; ++i) {
        uint32_t shift = (15u - i) * 4u;
        uint8_t nibble = static_cast<uint8_t>((h >> shift) & 0xFu);

        uint8_t ch = (nibble < 10)
            ? static_cast<uint8_t>('0' + nibble)
            : static_cast<uint8_t>('a' + (nibble - 10));

        out[i] = ch;
    }

    out[16] = 0; // null terminator

    return out_ptr;
}
