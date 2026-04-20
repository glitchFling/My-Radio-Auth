(module
  ;; 2 pages = 128 KiB
  (memory (export "memory") 2)

  ;; Simple bump allocator pointer
  (global $heap_ptr (mut i32) (i32.const 1024))

  ;; Last output length
  (global $last_len (mut i32) (i32.const 0))

  ;; alloc(len: i32) -> ptr: i32
  (func (export "alloc") (param $len i32) (result i32)
    (local $old i32)
    (local.set $old (global.get $heap_ptr))
    (global.set $heap_ptr
      (i32.add (global.get $heap_ptr) (local.get $len))
    )
    (local.get $old)
  )

  ;; get_last_len() -> i32
  (func (export "get_last_len") (result i32)
    (global.get $last_len)
  )

  ;; hash_str(ptr: i32, len: i32) -> out_ptr: i32
  ;; 64-bit FNV-1a, output 16 hex chars (lowercase)
  (func (export "hash_str") (param $ptr i32) (param $len i32) (result i32)
    (local $i i32)
    (local $out_ptr i32)
    (local $byte i32)
    (local $nibble i32)
    (local $ch i32)

    (local $h i64)
    (local $tmp i64)

    ;; FNV-1a 64-bit constants
    ;; offset basis: 1469598103934665603 = 0xcbf29ce484222325
    ;; prime:       1099511628211       = 0x00000100000001b3
    (local.set $h (i64.const 1469598103934665603))

    ;; loop over input bytes
    (local.set $i (i32.const 0))
    (loop $loop_bytes
      (br_if $done_bytes
        (i32.ge_u (local.get $i) (local.get $len))
      )

      ;; load byte
      (local.set $byte
        (i32.load8_u
          (i32.add (local.get $ptr) (local.get $i))
        )
      )

      ;; h ^= byte
      (local.set $h
        (i64.xor
          (local.get $h)
          (i64.extend_i32_u (local.get $byte))
        )
      )

      ;; h *= FNV prime
      (local.set $h
        (i64.mul
          (local.get $h)
          (i64.const 1099511628211)
        )
      )

      (local.set $i
        (i32.add (local.get $i) (i32.const 1))
      )
      (br $loop_bytes)
    )
    (loop $done_bytes)

    ;; allocate 16 hex chars + null terminator
    (local.set $out_ptr (call $alloc (i32.const 17)))
    (global.set $last_len (i32.const 16))

    ;; write 16 hex chars: from most significant nibble to least
    (local.set $i (i32.const 0))
    (loop $loop_hex
      (br_if $done_hex
        (i32.ge_u (local.get $i) (i32.const 16))
      )

      ;; shift = (15 - i) * 4
      (local.set $tmp
        (i64.shr_u
          (local.get $h)
          (i64.extend_i32_u
            (i32.mul
              (i32.sub (i32.const 15) (local.get $i))
              (i32.const 4)
            )
          )
        )
      )

      ;; nibble = (tmp & 0xF)
      (local.set $nibble
        (i32.wrap_i64
          (i64.and (local.get $tmp) (i64.const 0xF))
        )
      )

      ;; map nibble -> '0'-'9','a'-'f'
      (local.set $ch
        (i32.add
          (select
            (i32.const 87) ;; 'a' - 10
            (i32.const 48) ;; '0'
            (i32.lt_u (local.get $nibble) (i32.const 10))
          )
          (local.get $nibble)
        )
      )

      (i32.store8
        (i32.add (local.get $out_ptr) (local.get $i))
        (local.get $ch)
      )

      (local.set $i
        (i32.add (local.get $i) (i32.const 1))
      )
      (br $loop_hex)
    )
    (loop $done_hex)

    ;; null terminator
    (i32.store8
      (i32.add (local.get $out_ptr) (i32.const 16))
      (i32.const 0)
    )

    (local.get $out_ptr)
  )
)
